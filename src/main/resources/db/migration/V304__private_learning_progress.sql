CREATE TABLE learning_chapter_progress (
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    chapter_id VARCHAR(100) NOT NULL,
    chapter_version INT NOT NULL,
    understood_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id, user_id, chapter_id, chapter_version)
);
CREATE TABLE learning_journey_state (
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    current_chapter_id VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id, user_id)
);
CREATE TABLE learning_operation_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    chapter_id VARCHAR(100) NOT NULL,
    operation_name VARCHAR(120) NOT NULL,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX learning_operation_actor_chapter (company_id, user_id, chapter_id, occurred_at)
);
