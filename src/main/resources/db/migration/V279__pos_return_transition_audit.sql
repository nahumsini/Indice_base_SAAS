-- Keep actors/times for preparation cancellation and provider initiation without rewriting refund evidence.
ALTER TABLE pos_returns
    ADD COLUMN started_by_user_id BIGINT NULL,
    ADD COLUMN started_at TIMESTAMP NULL,
    ADD COLUMN cancelled_by_user_id BIGINT NULL,
    ADD COLUMN cancelled_at TIMESTAMP NULL;
