-- Public demo access is opt-in per company. Normal login and MFA remain unchanged.

ALTER TABLE companies
    ADD COLUMN public_demo_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD KEY idx_companies_public_demo (public_demo_enabled, id);
