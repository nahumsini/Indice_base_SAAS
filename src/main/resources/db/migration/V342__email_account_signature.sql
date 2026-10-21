-- Private, owner-scoped composer preference; existing clients preserve it when omitted.
ALTER TABLE email_mailboxes ADD COLUMN signature_text VARCHAR(2000) NOT NULL DEFAULT '';
