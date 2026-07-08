import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-12-18.acacia' as any,
  appInfo: {
    name: 'Nexus Studio',
    version: '1.0.0',
  },
});
