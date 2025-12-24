const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Get the origin for redirect URLs
    const origin = req.headers.origin || 'http://localhost:8081';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.EXPO_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      // Guest checkout - don't require account, create customer from email
      customer_creation: 'always',
      // Store user_id in metadata for webhook to link subscription
      metadata: {
        user_id: user_id,
      },
      subscription_data: {
        metadata: {
          user_id: user_id,
        },
      },
      // Redirect URLs
      success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?payment=cancelled`,
      // Allow promotion codes
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return res.status(500).json({ error: error.message });
  }
};
