# Web SaaS — Milestone 2: Stripe Billing & Webhooks

This milestone introduces SaaS subscription billing while keeping our Next.js application fully static. We avoid using server-side Next.js routes (which would break the static export for the desktop build) by leveraging **Stripe Payment Links** and a **Supabase Edge Function** to securely handle webhook events.

## What was added
- `lib/billing.ts` — configuration file containing Plan and Add-on definitions.
- `app/billing/page.tsx` — the Billing UI gear, accessible when `NEXT_PUBLIC_WEB_MODE=1`. It fetches the user's active plan/addons directly from Supabase.
- `supabase/functions/stripe-webhook/` — the Deno edge function that listens for Stripe events (`checkout.session.completed`, `customer.subscription.deleted`, etc.), extracts the user ID, and securely updates their profile using the Supabase Service Role key.

## Setup Instructions

### 1. Stripe Setup
1. Log into your [Stripe Dashboard](https://dashboard.stripe.com/).
2. Create your Products (e.g., "Pro Plan", "Studio Plan", "NSFW Unlock").
3. For each product, click **Create payment link**.
4. Important: To allow the edge function to know *which* plan or addon was bought, add a custom metadata key to the Payment Link.
   - For plans: Add metadata `plan=pro` or `plan=studio`.
   - For addons: Add metadata `addon=nsfw`.
5. Copy the Payment Link URLs and paste them into `lib/billing.ts` (`stripePaymentLink` properties).

### 2. Edge Function Deployment
You need to deploy the Supabase Edge Function to your Supabase project so it can listen for Stripe events.

1. In your terminal, initialize Supabase (if you haven't) and log in:
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```
2. Deploy the function:
   ```bash
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
   *Note: We use `--no-verify-jwt` because Stripe webhooks are sent directly from Stripe and won't contain a Supabase user token. We verify Stripe's cryptographic signature instead.*

### 3. Stripe Webhook Configuration
1. In your Stripe Dashboard, go to **Developers > Webhooks** and click **Add endpoint**.
2. Enter your edge function URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
3. Select the events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
4. Click **Add endpoint** and reveal your **Signing secret** (starts with `whsec_...`).

### 4. Edge Function Secrets
Provide the edge function with the required secrets to verify signatures and update the database:

```bash
supabase secrets set STRIPE_API_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

## How it works
1. The user goes to the **Billing Gear** in the web app.
2. They click "Upgrade to Pro". The UI generates a URL: `https://buy.stripe.com/test_123?client_reference_id=UUID`.
3. The user pays on Stripe.
4. Stripe fires the `checkout.session.completed` event to your Supabase Edge Function.
5. The Edge Function verifies the signature, reads the `client_reference_id` (the user's UUID) and the metadata (`plan=pro`).
6. The Edge Function updates the user's `profiles.plan` in Supabase to `pro`.
7. The user's Billing UI automatically updates the next time it loads.
