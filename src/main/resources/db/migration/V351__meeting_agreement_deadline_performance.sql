-- Preserve adopted deadlines and confirmed fulfilment; historical uncertainty stays explicit.
ALTER TABLE meeting_agreements
 ADD COLUMN original_due_date DATE NULL,
 ADD COLUMN deadline_basis VARCHAR(16) NOT NULL DEFAULT 'ADOPTED',
 ADD COLUMN fulfilled_at DATETIME(6) NULL;
UPDATE meeting_agreements SET original_due_date=due_date;
UPDATE meeting_agreements a JOIN (
 SELECT company_id,agreement_id,MIN(occurred_at) fulfilled_at FROM meeting_audit
 WHERE action='AGREEMENT_DONE' AND agreement_id IS NOT NULL GROUP BY company_id,agreement_id
) h ON h.company_id=a.company_id AND h.agreement_id=a.id
 SET a.fulfilled_at=h.fulfilled_at WHERE a.status='DONE';
ALTER TABLE meeting_agreements MODIFY original_due_date DATE NOT NULL;
ALTER TABLE meeting_agreement_task_links ADD COLUMN delegation_fingerprint VARCHAR(64) NULL;
CREATE TABLE meeting_agreement_revisions (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL, agreement_id BIGINT NOT NULL, actor_id BIGINT NOT NULL,
 previous_assignee_id BIGINT NOT NULL, assignee_id BIGINT NOT NULL,
 previous_due_date DATE NOT NULL, due_date DATE NOT NULL,
 reason VARCHAR(2000) NOT NULL, occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 INDEX idx_meeting_agreement_revision(company_id,agreement_id,id),
 CONSTRAINT fk_meeting_agreement_revision FOREIGN KEY(company_id,agreement_id)
 REFERENCES meeting_agreements(company_id,id)
);
