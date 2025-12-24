const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Check if user already has a Stripe customer
    let customerId;
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user_id)
      .single();

    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      // Create a new customer
      const customer = await stripe.customers.create({
        metadata: { user_id },
      });
      customerId = customer.id;
    }

    // Create ephemeral key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2023-10-16' }
    );

    // Get the price amount
    const price = await stripe.prices.retrieve(process.env.EXPO_PUBLIC_STRIPE_PREMIUM_PRICE_ID);
    const amount = price.unit_amount;

    // Create a subscription with payment behavior that requires payment
    // This creates a PaymentIntent automatically
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: process.env.EXPO_PUBLIC_STRIPE_PREMIUM_PRICE_ID }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: { user_id },
    });

    const paymentIntent = subscription.latest_invoice.payment_intent;

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      customerId,
      ephemeralKey: ephemeralKey.secret,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    return res.status(500).json({ error: error.message });
  }
};
