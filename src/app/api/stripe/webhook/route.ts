import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe, planForPriceId } from "@/lib/stripe";

// Stripe needs the raw body to verify the signature.
export const dynamic = "force-dynamic";

/** Provision a user's plan/quota period from a Stripe Subscription object. */
async function applySubscription(sub: Stripe.Subscription) {
  const md = (sub.metadata ?? {}) as Record<string, string>;
  const userId = md.userId;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const priceId = sub.items?.data?.[0]?.price?.id;
  const plan = planForPriceId(priceId) ?? (md.plan as "pro" | "max" | undefined) ?? null;
  const status = sub.status;
  const active = status === "active" || status === "trialing";

  // current_period_* live on the subscription (fall back to the item for
  // newer API versions that moved them). Cast to stay version-agnostic.
  const anySub = sub as unknown as {
    current_period_end?: number;
    current_period_start?: number;
    items?: { data?: Array<{ current_period_end?: number; current_period_start?: number }> };
  };
  const periodEnd = anySub.current_period_end ?? anySub.items?.data?.[0]?.current_period_end;
  const periodStart = anySub.current_period_start ?? anySub.items?.data?.[0]?.current_period_start;

  const data: Record<string, unknown> = {
    stripeSubscriptionId: sub.id,
    stripeStatus: status,
  };
  if (customerId) data.stripeCustomerId = customerId;
  if (periodEnd) data.stripeCurrentPeriodEnd = new Date(periodEnd * 1000);
  if (active && plan) {
    data.plan = plan;
    // Align the token quota period to the billing cycle.
    if (periodStart) data.planPeriodStart = new Date(periodStart * 1000);
  }

  if (userId) {
    await prisma.user.update({ where: { id: userId }, data }).catch(() => {});
  } else if (customerId) {
    await prisma.user.updateMany({ where: { stripeCustomerId: customerId }, data });
  }
}

async function cancelSubscription(sub: Stripe.Subscription) {
  const userId = (sub.metadata as Record<string, string>)?.userId;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const data = { plan: "free", stripeStatus: "canceled", stripeSubscriptionId: null };
  if (userId) await prisma.user.update({ where: { id: userId }, data }).catch(() => {});
  else if (customerId) await prisma.user.updateMany({ where: { stripeCustomerId: customerId }, data });
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!secret || !sig) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("stripe signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = (s.metadata as Record<string, string>)?.userId ?? s.client_reference_id;
        const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id;
        if (userId && customerId) {
          await prisma.user
            .update({ where: { id: userId }, data: { stripeCustomerId: customerId } })
            .catch(() => {});
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await applySubscription(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await cancelSubscription(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("stripe webhook handler error", event.type, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
