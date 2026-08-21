CREATE TABLE IF NOT EXISTS training_item_progress (
    user_id BIGINT NOT NULL,
    program_code VARCHAR(80) NOT NULL,
    program_version VARCHAR(40) NOT NULL,
    item_code VARCHAR(120) NOT NULL,
    completed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id, program_code, program_version, item_code),
    CONSTRAINT fk_training_item_progress_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_training_item_progress_program (program_code, program_version, completed_at)
);
