import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });

const WEBSITE_URL = Deno.env.get('WEBSITE_URL') || 'https://remorph.it';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
};

// Valid price IDs
const VALID_PRICES = new Set([
  Deno.env.get('STRIPE_STARTER_MONTHLY_PRICE_ID'),
  Deno.env.get('STRIPE_STARTER_YEARLY_PRICE_ID'),
  Deno.env.get('STRIPE_PRO_MONTHLY_PRICE_ID'),
  Deno.env.get('STRIPE_PRO_YEARLY_PRICE_ID'),
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { priceId, uid, email } = await req.json();

    if (!priceId || !VALID_PRICES.has(priceId)) {
      return new Response(JSON.stringify({ error: 'Invalid price' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!uid) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: uid,
      customer_email: email || undefined,
      success_url: `${WEBSITE_URL}?success=true#pricing`,
      cancel_url: `${WEBSITE_URL}?email=${encodeURIComponent(email || '')}&uid=${encodeURIComponent(uid)}#pricing`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
