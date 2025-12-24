const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, email } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const priceId = process.env.EXPO_PUBLIC_STRIPE_PREMIUM_PRICE_ID?.trim();
    if (!priceId) {
      return res.status(500).json({ error: 'Price ID not configured' });
    }

    // Find or create customer
    let customer;
    const existingCustomers = await stripe.customers.search({
      query: `metadata['user_id']:'${user_id}'`,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];

      // Check for existing incomplete subscriptions and cancel them
      const existingSubs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'incomplete',
        limit: 10,
      });

      for (const sub of existingSubs.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    } else {
      customer = await stripe.customers.create({
        email: email || undefined,
        metadata: { user_id },
      });
    }

    // Create a SetupIntent to collect payment method for the subscription
    // This is the recommended approach for Payment Element with subscriptions
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      metadata: {
        user_id,
        price_id: priceId,
      },
    });

    return res.status(200).json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
    });
  } catch (error) {
    console.error('Create subscription error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
