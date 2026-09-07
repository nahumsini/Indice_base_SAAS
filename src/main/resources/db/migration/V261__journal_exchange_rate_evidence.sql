-- Add provenance for new foreign-currency postings; historical journal values remain untouched.
ALTER TABLE finance_journal_entries ADD COLUMN exchange_rate_evidence_json JSON NULL;
