import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { isPlanId } from "@/config/plans";
import { stripe, priceIdForPlan, appBaseUrl } from "@/lib/stripe";

const bodySchema = z.object({ plan: z.string() });

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { plan } = bodySchema.parse(await req.json());

    if (!isPlanId(plan) || plan === "free") {
      return NextResponse.json({ error: "Choose a paid plan to upgrade." }, { status: 400 });
    }
    const priceId = priceIdForPlan(plan);
    if (!priceId) {
      return NextResponse.json(
        { error: "Billing isn't configured for this plan (missing Stripe price)." },
        { status: 500 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, stripeCustomerId: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Reuse or create the Stripe customer.
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appBaseUrl}/settings?billing=success`,
      cancel_url: `${appBaseUrl}/settings?billing=cancel`,
      client_reference_id: userId,
      metadata: { userId, plan },
      subscription_data: { metadata: { userId, plan } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("checkout failed", err);
    return NextResponse.json(
      { error: "Could not start checkout. Check STRIPE_SECRET_KEY / price IDs." },
      { status: 500 },
    );
  }
}
