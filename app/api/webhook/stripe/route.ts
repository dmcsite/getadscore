import { NextRequest, NextResponse } from "next/server";
import { markSubscribed } from "@/lib/db";
import Stripe from "stripe";

// Lazy initialization to avoid build-time errors
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle successful checkout
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_details?.email;

    if (customerEmail) {
      try {
        await markSubscribed(customerEmail);
        console.log(`Marked ${customerEmail} as subscribed`);
      } catch (err) {
        console.error("Failed to mark user as subscribed:", err);
      }
    }
  }

  // Handle subscription events for recurring billing
  if (event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;

    // Get customer email
    if (subscription.customer) {
      try {
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (customer && !customer.deleted && customer.email) {
          await markSubscribed(customer.email);
          console.log(`Marked ${customer.email} as subscribed (subscription event)`);
        }
      } catch (err) {
        console.error("Failed to process subscription event:", err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
