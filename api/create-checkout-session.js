const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, embedded } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Get the origin for redirect URLs
    const origin = req.headers.origin || 'http://localhost:8081';

    // Base session configuration
    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.EXPO_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      // Note: customer_creation is not valid for subscription mode
      // Stripe automatically creates a customer when checkout completes
      // Store user_id in metadata for webhook to link subscription
      metadata: {
        user_id: user_id,
      },
      subscription_data: {
        metadata: {
          user_id: user_id,
        },
      },
      // Allow promotion codes
      allow_promotion_codes: true,
    };

    // Embedded mode uses ui_mode and return_url
    if (embedded) {
      sessionConfig.ui_mode = 'embedded';
      sessionConfig.return_url = `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    } else {
      // Redirect mode uses success_url and cancel_url
      sessionConfig.success_url = `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      sessionConfig.cancel_url = `${origin}/?payment=cancelled`;
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Return appropriate response based on mode
    if (embedded) {
      return res.status(200).json({ clientSecret: session.client_secret });
    } else {
      return res.status(200).json({ url: session.url });
    }
  } catch (error) {
    console.error('Checkout session error:', error);
    return res.status(500).json({ error: error.message });
  }
};
