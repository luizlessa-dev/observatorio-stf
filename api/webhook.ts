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

// Onda 1 (2026-08-17), C2: o webhook gravava a assinatura sem `user_id`, e a
// única policy de stf_assinaturas era `auth.uid() = user_id`. Com user_id nulo
// a comparação nunca é true e a linha ficava invisível para o próprio dono —
// a pessoa pagava e o site continuava mostrando o botão de apoio para sempre.
// A migration 0005 acrescenta a policy por e-mail verificado e a função
// stf_resolver_user_id(); aqui o webhook passa a preencher user_id quando a
// conta já existe. Ver docs/auditoria-onda-1.md.
async function resolverUserId(email: string): Promise<string | null> {
  if (!email) return null;
  const { data, error } = await sb.rpc("stf_resolver_user_id", { p_email: email });
  if (error) {
    console.error("stf_resolver_user_id falhou", error.message);
    return null;
  }
  return (data as string | null) ?? null;
}

// `current_period_end` saiu do objeto Subscription e passou para os itens da
// assinatura nas versões recentes da API do Stripe (a declarada aqui é
// 2025-05-28.basil). Ler só do objeto raiz devolvia undefined, e
// `new Date(undefined * 1000).toISOString()` lança — o webhook respondia 500
// ao Stripe e a assinatura nunca era registrada. Lê dos dois lugares.
function fimDoPeriodo(sub: Stripe.Subscription): string | null {
  const raiz = (sub as unknown as { current_period_end?: number }).current_period_end;
  const doItem = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const ts = raiz ?? doItem?.current_period_end;
  if (typeof ts !== "number" || !Number.isFinite(ts)) {
    console.error("current_period_end ausente na assinatura", sub.id);
    return null;
  }
  return new Date(ts * 1000).toISOString();
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

    await sb.from("stf_assinaturas").upsert({
      email,
      user_id:            await resolverUserId(email),
      stripe_customer_id: custId,
      stripe_sub_id:      subId,
      plano,
      status:             "ativa",
      vigente_ate:        fimDoPeriodo(sub),
    }, { onConflict: "stripe_sub_id" });
  }

  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.paused") {
    const sub    = event.data.object as Stripe.Subscription;
    const status = event.type === "customer.subscription.deleted" ? "cancelada" : "pausada";
    await sb.from("stf_assinaturas").update({ status, updated_at: new Date().toISOString() })
      .eq("stripe_sub_id", sub.id);
  }

  if (event.type === "customer.subscription.updated") {
    const sub    = event.data.object as Stripe.Subscription;
    const status = sub.status === "active" ? "ativa" : sub.status === "paused" ? "pausada" : "cancelada";
    await sb.from("stf_assinaturas").update({
      status,
      vigente_ate: fimDoPeriodo(sub),
      updated_at:  new Date().toISOString(),
    }).eq("stripe_sub_id", sub.id);
  }

  res.json({ ok: true });
}
