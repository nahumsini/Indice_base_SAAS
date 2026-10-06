-- Messaging and customer care follow the platform lead migrations through V290.
CREATE TABLE messaging_conversations (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    kind VARCHAR(20) NOT NULL,
    subject VARCHAR(180) NOT NULL,
    topic VARCHAR(24) NOT NULL DEFAULT 'CONSULTATION',
    module_name VARCHAR(120) NULL,
    language VARCHAR(12) NOT NULL DEFAULT 'en-CA',
    status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(12) NOT NULL DEFAULT 'MEDIUM',
    created_by_membership_id BIGINT NOT NULL,
    distributor_company_id BIGINT NULL,
    assigned_user_id BIGINT NULL,
    direct_key VARCHAR(80) NULL,
    request_key CHAR(36) NOT NULL,
    creation_fingerprint CHAR(64) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    last_message_id BIGINT NULL,
    first_response_at TIMESTAMP(6) NULL,
    resolved_at TIMESTAMP(6) NULL,
    awaiting_since TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uq_messaging_direct (company_id, direct_key),
    UNIQUE KEY uq_messaging_creation (company_id, created_by_membership_id, request_key),
    KEY ix_messaging_company (company_id, updated_at, id),
    KEY ix_messaging_care (kind, status, updated_at, id),
    KEY ix_messaging_distributor (distributor_company_id, kind, status, updated_at),
    CONSTRAINT fk_messaging_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_messaging_creator FOREIGN KEY (created_by_membership_id) REFERENCES user_companies(id),
    CONSTRAINT fk_messaging_distributor FOREIGN KEY (distributor_company_id) REFERENCES companies(id),
    CONSTRAINT fk_messaging_assignee FOREIGN KEY (assigned_user_id) REFERENCES users(id),
    CONSTRAINT ck_messaging_kind CHECK (kind IN ('DIRECT','SUPPORT','DISTRIBUTOR')),
    CONSTRAINT ck_messaging_status CHECK (status IN ('OPEN','WAITING_CUSTOMER','RESOLVED')),
    CONSTRAINT ck_messaging_topic CHECK (topic IN ('CONSULTATION','FAILURE','IMPROVEMENT')),
    CONSTRAINT ck_messaging_priority CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE messaging_participants (
    conversation_id BIGINT NOT NULL,
    membership_id BIGINT NOT NULL,
    PRIMARY KEY (conversation_id, membership_id),
    KEY ix_messaging_member (membership_id, conversation_id),
    FOREIGN KEY (conversation_id) REFERENCES messaging_conversations(id),
    FOREIGN KEY (membership_id) REFERENCES user_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE messaging_messages (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sender_user_id BIGINT NOT NULL,
    sender_scope VARCHAR(20) NOT NULL,
    visibility VARCHAR(12) NOT NULL DEFAULT 'PUBLIC',
    request_key CHAR(36) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uq_messaging_send (conversation_id, sender_user_id, sender_scope, request_key),
    KEY ix_messaging_history (conversation_id, visibility, id),
    KEY ix_messaging_rate (sender_user_id, created_at),
    FOREIGN KEY (conversation_id) REFERENCES messaging_conversations(id),
    FOREIGN KEY (sender_user_id) REFERENCES users(id),
    CHECK (sender_scope IN ('MEMBER','PLATFORM','DISTRIBUTOR')),
    CHECK (visibility IN ('PUBLIC','INTERNAL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE messaging_reads (
    conversation_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    actor_scope VARCHAR(20) NOT NULL,
    last_message_id BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (conversation_id, user_id, actor_scope),
    FOREIGN KEY (conversation_id) REFERENCES messaging_conversations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE messaging_audit (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    actor_user_id BIGINT NOT NULL,
    action VARCHAR(24) NOT NULL,
    detail VARCHAR(240) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY ix_messaging_audit (conversation_id, id),
    FOREIGN KEY (conversation_id) REFERENCES messaging_conversations(id),
    FOREIGN KEY (actor_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE messaging_notification_outbox (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    message_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    recipient_membership_id BIGINT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    available_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    delivered_at TIMESTAMP(6) NULL,
    UNIQUE KEY uq_messaging_notice (message_id, recipient_membership_id),
    KEY ix_messaging_outbox (delivered_at, available_at, id),
    FOREIGN KEY (message_id) REFERENCES messaging_messages(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (recipient_membership_id) REFERENCES user_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
