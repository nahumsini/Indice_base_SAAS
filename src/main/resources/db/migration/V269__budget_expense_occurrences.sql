-- Additive rollout only: no historical expense, payment, balance or budget is rewritten.
CREATE TABLE finance_budget_expense_rollout (
    id TINYINT NOT NULL PRIMARY KEY,
    activated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_budget_expense_rollout_singleton CHECK (id = 1)
) ENGINE=InnoDB;

INSERT INTO finance_budget_expense_rollout (id) VALUES (1);

CREATE TABLE finance_budget_expense_occurrences (
    company_id BIGINT NOT NULL,
    budget_line_id BIGINT NOT NULL,
    scheduled_date DATE NULL,
    expense_id BIGINT NULL,
    status VARCHAR(24) NOT NULL,
    reason VARCHAR(48) NULL,
    source_version BIGINT NOT NULL,
    created_by_user_id BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (company_id, budget_line_id),
    KEY idx_budget_occurrence_expense (expense_id),
    CONSTRAINT fk_budget_occurrence_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_budget_occurrence_line FOREIGN KEY (budget_line_id) REFERENCES finance_budget_lines(id),
    CONSTRAINT fk_budget_occurrence_expense FOREIGN KEY (expense_id) REFERENCES finance_expenses(id),
    CONSTRAINT fk_budget_occurrence_actor FOREIGN KEY (created_by_user_id) REFERENCES users(id),
    CONSTRAINT chk_budget_occurrence_status CHECK (status IN ('GENERATED', 'EXISTING', 'REVIEW'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
