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
    const customerId = session.customer as string;

    if (customerEmail) {
      try {
        // Determine plan type from the session
        let planType = "individual"; // default

        // Try to get line items to determine plan
        if (session.id) {
          try {
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
            const item = lineItems.data[0];
            if (item?.price?.product) {
              const product = await stripe.products.retrieve(item.price.product as string);
              const productName = product.name.toLowerCase();
              if (productName.includes("agency")) {
                planType = "agency";
              } else if (productName.includes("individual")) {
                planType = "individual";
              }
            }
          } catch (lineItemErr) {
            console.error("Failed to get line items:", lineItemErr);
          }
        }

        await markSubscribed(customerEmail, planType, customerId);
        console.log(`Marked ${customerEmail} as subscribed (${planType})`);
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
