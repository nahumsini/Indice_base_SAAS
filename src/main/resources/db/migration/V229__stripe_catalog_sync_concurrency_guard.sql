-- Only one Stripe synchronization may own a catalog product and mode at a
-- time. The application sets this lease key only while an operation is
-- RUNNING and clears it on every terminal transition. NULL values keep the
-- full completed, failed and pending history without colliding.
ALTER TABLE billing_catalog_stripe_sync_operations
  ADD COLUMN running_scope VARCHAR(320) NULL AFTER status,
  ADD UNIQUE KEY uq_billing_catalog_stripe_sync_running_scope (running_scope);
