const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customer_id, payment_method_id, user_id } = req.body;

    if (!customer_id || !payment_method_id || !user_id) {
      return res.status(400).json({ error: 'customer_id, payment_method_id, and user_id are required' });
    }

    const priceId = process.env.EXPO_PUBLIC_STRIPE_PREMIUM_PRICE_ID?.trim();
    if (!priceId) {
      return res.status(500).json({ error: 'Price ID not configured' });
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(payment_method_id, {
      customer: customer_id,
    });

    // Set as default payment method
    await stripe.customers.update(customer_id, {
      invoice_settings: {
        default_payment_method: payment_method_id,
      },
    });

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer_id,
      items: [{ price: priceId }],
      default_payment_method: payment_method_id,
      metadata: { user_id },
    });

    return res.status(200).json({
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (error) {
    console.error('Complete subscription error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
