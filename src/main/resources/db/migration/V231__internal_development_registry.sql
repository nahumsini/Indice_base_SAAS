-- Root-only corporate registry for weekly contributions, meetings, minutes and decisions.
-- Entries are never hard-deleted; revisions preserve the complete corporate trace.

CREATE TABLE internal_development_entries (
    id BIGINT NOT NULL AUTO_INCREMENT,
    folio VARCHAR(40) NOT NULL,
    entry_type VARCHAR(32) NOT NULL,
    area VARCHAR(24) NOT NULL,
    status VARCHAR(16) NOT NULL,
    title VARCHAR(180) NOT NULL,
    summary VARCHAR(700) NOT NULL,
    details TEXT NULL,
    decisions TEXT NULL,
    next_steps TEXT NULL,
    event_at TIMESTAMP(6) NOT NULL,
    period_start DATE NULL,
    period_end DATE NULL,
    location VARCHAR(180) NULL,
    reference_url VARCHAR(700) NULL,
    owner_user_id BIGINT NOT NULL,
    related_entry_id BIGINT NULL,
    created_by_user_id BIGINT NOT NULL,
    updated_by_user_id BIGINT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_internal_development_entries_folio (folio),
    KEY idx_internal_development_entries_type_status_event (entry_type, status, event_at),
    KEY idx_internal_development_entries_owner_period (owner_user_id, period_start, period_end),
    KEY idx_internal_development_entries_area_created (area, created_at),
    KEY idx_internal_development_entries_related (related_entry_id),
    CONSTRAINT fk_internal_development_entries_owner
        FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_internal_development_entries_related
        FOREIGN KEY (related_entry_id) REFERENCES internal_development_entries (id) ON DELETE SET NULL,
    CONSTRAINT fk_internal_development_entries_creator
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_internal_development_entries_updater
        FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT chk_internal_development_entries_type
        CHECK (entry_type IN (
            'WEEKLY_REPORT', 'CONTRIBUTION', 'BOARD_MEETING', 'WORKING_MEETING',
            'MINUTES', 'DECISION'
        )),
    CONSTRAINT chk_internal_development_entries_area
        CHECK (area IN (
            'DEVELOPMENT', 'PRODUCT', 'OPERATIONS', 'COMMERCIAL',
            'FINANCE', 'GOVERNANCE', 'GENERAL'
        )),
    CONSTRAINT chk_internal_development_entries_status
        CHECK (status IN ('DRAFT', 'PLANNED', 'RECORDED', 'CLOSED', 'CANCELLED')),
    CONSTRAINT chk_internal_development_entries_period
        CHECK (period_start IS NULL OR period_end IS NULL OR period_start <= period_end),
    CONSTRAINT chk_internal_development_entries_version
        CHECK (version > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE internal_development_entry_participants (
    entry_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (entry_id, user_id),
    KEY idx_internal_development_participants_user (user_id, created_at),
    CONSTRAINT fk_internal_development_participants_entry
        FOREIGN KEY (entry_id) REFERENCES internal_development_entries (id) ON DELETE CASCADE,
    CONSTRAINT fk_internal_development_participants_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE internal_development_entry_history (
    id BIGINT NOT NULL AUTO_INCREMENT,
    entry_id BIGINT NOT NULL,
    entry_version INT NOT NULL,
    action_code VARCHAR(24) NOT NULL,
    changed_by_user_id BIGINT NOT NULL,
    snapshot_json JSON NOT NULL,
    changed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_internal_development_history_version (entry_id, entry_version),
    KEY idx_internal_development_history_changed (changed_at, changed_by_user_id),
    CONSTRAINT fk_internal_development_history_entry
        FOREIGN KEY (entry_id) REFERENCES internal_development_entries (id) ON DELETE RESTRICT,
    CONSTRAINT fk_internal_development_history_actor
        FOREIGN KEY (changed_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT chk_internal_development_history_action
        CHECK (action_code IN ('CREATED', 'UPDATED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
