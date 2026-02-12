import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Stripe Price ID → Plan mapping
const PRICE_TO_PLAN: Record<string, string> = {
  [Deno.env.get('STRIPE_STARTER_MONTHLY_PRICE_ID') || '']: 'starter',
  [Deno.env.get('STRIPE_STARTER_YEARLY_PRICE_ID') || '']: 'starter',
  [Deno.env.get('STRIPE_PRO_MONTHLY_PRICE_ID') || '']: 'pro',
  [Deno.env.get('STRIPE_PRO_YEARLY_PRICE_ID') || '']: 'pro',
};

function planFromPriceId(priceId: string): string | null {
  return PRICE_TO_PLAN[priceId] || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  console.log(`Received event: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId = session.customer as string;

      if (!userId) {
        console.error('No client_reference_id in checkout session');
        break;
      }

      // Get the price from the line items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;
      const plan = priceId ? planFromPriceId(priceId) : null;

      if (!plan) {
        console.error(`Unknown price ID: ${priceId}`);
        break;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ plan, stripe_customer_id: customerId })
        .eq('id', userId);

      if (error) {
        console.error('Failed to update profile:', error);
      } else {
        console.log(`Updated user ${userId} to plan: ${plan}`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { error } = await supabase
        .from('profiles')
        .update({ plan: 'trial' })
        .eq('stripe_customer_id', customerId);

      if (error) {
        console.error('Failed to reset plan on subscription deletion:', error);
      } else {
        console.log(`Reset plan for customer ${customerId}`);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price?.id;
      const plan = priceId ? planFromPriceId(priceId) : null;

      if (!plan) {
        console.error(`Unknown price ID on subscription update: ${priceId}`);
        break;
      }

      // If subscription is no longer active, reset to trial
      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        await supabase
          .from('profiles')
          .update({ plan: 'trial' })
          .eq('stripe_customer_id', customerId);
        console.log(`Subscription inactive, reset customer ${customerId} to trial`);
        break;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ plan })
        .eq('stripe_customer_id', customerId);

      if (error) {
        console.error('Failed to update plan on subscription change:', error);
      } else {
        console.log(`Updated customer ${customerId} to plan: ${plan}`);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
