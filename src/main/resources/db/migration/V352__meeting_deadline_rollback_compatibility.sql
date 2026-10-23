-- Older application binaries omit this additive field. Keep their inserts writable on rollback;
-- new owner code always records a CREATED baseline, legacy writes remain explicitly unscored.
ALTER TABLE meeting_agreements MODIFY COLUMN original_due_date DATE NULL;
