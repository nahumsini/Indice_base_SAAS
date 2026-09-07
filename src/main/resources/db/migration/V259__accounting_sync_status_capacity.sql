-- COMPLETED_WITH_ISSUES is 21 characters; retain its canonical API status without truncation.
ALTER TABLE finance_accounting_sync_runs MODIFY COLUMN status VARCHAR(32) NOT NULL;
