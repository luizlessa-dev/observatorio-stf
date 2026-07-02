import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-05-28.basil" });

const PRICES: Record<string, string> = {
  mensal: process.env.STRIPE_PRICE_MENSAL!,
  anual:  process.env.STRIPE_PRICE_ANUAL!,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { plano, email } = req.body as { plano?: string; email?: string };

  if (!plano || !PRICES[plano]) return res.status(400).json({ error: "plano inválido" });
  if (!email)                   return res.status(400).json({ error: "email obrigatório" });

  const origin = req.headers.origin || "https://observatoriodostf.org";

  const session = await stripe.checkout.sessions.create({
    mode:                 "subscription",
    line_items:           [{ price: PRICES[plano], quantity: 1 }],
    customer_email:       email,
    success_url:          `${origin}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:           `${origin}/assinar`,
    subscription_data:    { metadata: { plano } },
    metadata:             { plano },
    locale:               "pt-BR",
    payment_method_types: ["card"],
  });

  res.json({ url: session.url });
}
