-- Reconciliation must stop before Stripe's idempotency retention can permit a duplicate create.
ALTER TABLE billing_trial_payment_consents ADD COLUMN subscription_requested_at DATETIME(6) NULL;
