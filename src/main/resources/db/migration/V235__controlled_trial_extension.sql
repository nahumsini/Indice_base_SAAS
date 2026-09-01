-- A public trial starts with 15 days and can be extended once, after a
-- consultation, without ever exceeding 30 total days.

ALTER TABLE platform_trial_extensions
  ADD COLUMN trial_started_at TIMESTAMP(6) NULL AFTER added_days,
  ADD COLUMN consultation_confirmed TINYINT(1) NOT NULL DEFAULT 0 AFTER trial_started_at;
