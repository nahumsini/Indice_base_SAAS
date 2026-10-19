-- Sender-owned private staging before a conversation exists.
ALTER TABLE messaging_attachments
    MODIFY conversation_id BIGINT NULL,
    ADD COLUMN draft_key CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    ADD UNIQUE KEY uq_messaging_draft_upload (company_id,sender_user_id,sender_scope,draft_key);
