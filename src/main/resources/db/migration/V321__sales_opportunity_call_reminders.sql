-- next_action_at retains the existing wall-clock API. Only a complete, unambiguous
-- schedule has a UTC instant. Legacy date-only/midnight values are never guessed.
ALTER TABLE sales_opportunities
    ADD COLUMN next_action_scheduled_at DATETIME NULL AFTER next_action_at,
    ADD COLUMN next_action_timezone VARCHAR(64) NULL AFTER next_action_scheduled_at,
    ADD INDEX idx_sales_opportunity_reminder (next_action_scheduled_at, id);
