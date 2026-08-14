-- The operational payroll lifecycle is Draft -> Approved -> Paid.
-- "processed" was an intermediate UI state; retain its processing audit fields
-- while returning historical open runs to the editable draft state.
UPDATE payroll_runs
SET status = 'draft',
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(TRIM(status)) = 'processed';
