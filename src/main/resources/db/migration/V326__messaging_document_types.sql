-- Preserve attachment ownership and routes; allow the official Word/Excel MIME lengths.
ALTER TABLE messaging_attachments MODIFY content_type VARCHAR(127) NOT NULL;
