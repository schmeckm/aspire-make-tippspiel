const express = require('express');
const Stripe = require('stripe');
const { sendError } = require('../utils/apiResponse');

const router = express.Router();

function isSaasEnabled() {
  return process.env.SAAS_ENABLED === 'true';
}

function getRequiredStripeConfig() {
  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  const priceId = (process.env.STRIPE_PRICE_ID || '').trim();
  return { secretKey, webhookSecret, priceId };
}

function getBaseAppUrl(req) {
  const configured = (process.env.APP_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
  return `${proto}://${host}`.replace(/\/$/, '');
}

function getSuccessUrl(req) {
  const configured = (process.env.STRIPE_SUCCESS_URL || '').trim();
  if (configured) return configured;
  return `${getBaseAppUrl(req)}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
}

function getCancelUrl(req) {
  const configured = (process.env.STRIPE_CANCEL_URL || '').trim();
  if (configured) return configured;
  return `${getBaseAppUrl(req)}/pricing?canceled=1`;
}

function getStripeClient(secretKey) {
  return new Stripe(secretKey, { apiVersion: '2024-06-20' });
}

router.post('/checkout', async (req, res) => {
  try {
    if (!isSaasEnabled()) {
      return sendError(res, req, 503, 'errors.saasDisabled');
    }

    const { secretKey, priceId } = getRequiredStripeConfig();
    if (!secretKey || !priceId) {
      return sendError(res, req, 503, 'errors.billingNotConfigured');
    }

    const plan = typeof req.body?.plan === 'string' ? req.body.plan.trim() : 'default';
    const tenantName = typeof req.body?.tenantName === 'string' ? req.body.tenantName.trim().slice(0, 120) : '';
    const tenantSlug = typeof req.body?.tenantSlug === 'string' ? req.body.tenantSlug.trim().slice(0, 64) : '';

    const stripe = getStripeClient(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: getSuccessUrl(req),
      cancel_url: getCancelUrl(req),
      metadata: {
        plan,
        tenantName,
        tenantSlug,
      },
    });

    res.json({ url: session.url, id: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: error.message || 'checkout_failed' });
  }
});

router.post('/webhook', async (req, res) => {
  // This route relies on raw-body middleware in app.js.
  try {
    const { secretKey, webhookSecret } = getRequiredStripeConfig();
    if (!secretKey) return res.status(200).json({ ok: true, skipped: true, reason: 'no_secret_key' });

    const stripe = getStripeClient(secretKey);
    const signature = req.headers['stripe-signature'];

    if (!webhookSecret) {
      console.warn('[Billing] STRIPE_WEBHOOK_SECRET missing – accepting webhook without verification.');
      return res.status(200).json({ ok: true, skipped: true, reason: 'no_webhook_secret' });
    }

    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({ error: 'Webhook raw body missing (misconfigured middleware).' });
    }

    const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

    // MVP: store minimal subscription state later; for now we only acknowledge.
    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      console.log('[Billing] checkout.session.completed', {
        id: session?.id,
        subscription: session?.subscription,
        customer: session?.customer,
        metadata: session?.metadata,
      });
    }

    if (event.type === 'customer.subscription.created'
      || event.type === 'customer.subscription.updated'
      || event.type === 'customer.subscription.deleted') {
      const sub = event.data?.object;
      console.log(`[Billing] ${event.type}`, { id: sub?.id, status: sub?.status, customer: sub?.customer });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Stripe webhook error:', error.message || error);
    return res.status(400).json({ error: `webhook_error: ${error.message || 'invalid'}` });
  }
});

module.exports = router;

