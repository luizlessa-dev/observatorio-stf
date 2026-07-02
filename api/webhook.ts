import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-05-28.basil" });
const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const config = { api: { bodyParser: false } };

async function buffer(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;
  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return res.status(400).send("Webhook signature inválida");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== "subscription") return res.json({ ok: true });

    const email     = session.customer_email ?? "";
    const subId     = session.subscription as string;
    const custId    = session.customer as string;
    const plano     = (session.metadata?.plano ?? "mensal") as "mensal" | "anual";

    const sub = await stripe.subscriptions.retrieve(subId);
    const vigentaAte = new Date((sub.current_period_end) * 1000).toISOString();

    await sb.from("stf_assinaturas").upsert({
      email,
      stripe_customer_id: custId,
      stripe_sub_id:      subId,
      plano,
      status:             "ativa",
      vigente_ate:        vigentaAte,
    }, { onConflict: "stripe_sub_id" });
  }

  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.paused") {
    const sub    = event.data.object as Stripe.Subscription;
    const status = event.type === "customer.subscription.deleted" ? "cancelada" : "pausada";
    await sb.from("stf_assinaturas").update({ status, updated_at: new Date().toISOString() })
      .eq("stripe_sub_id", sub.id);
  }

  if (event.type === "customer.subscription.updated") {
    const sub        = event.data.object as Stripe.Subscription;
    const vigentaAte = new Date(sub.current_period_end * 1000).toISOString();
    const status     = sub.status === "active" ? "ativa" : sub.status === "paused" ? "pausada" : "cancelada";
    await sb.from("stf_assinaturas").update({ status, vigente_ate: vigentaAte, updated_at: new Date().toISOString() })
      .eq("stripe_sub_id", sub.id);
  }

  res.json({ ok: true });
}
