import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { stripe, appBaseUrl } from "@/lib/stripe";

export async function POST() {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "No billing account yet." }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appBaseUrl}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("portal failed", err);
    return NextResponse.json({ error: "Could not open the billing portal." }, { status: 500 });
  }
}
