ALTER TABLE kiosk_definitions
    ADD COLUMN audience VARCHAR(24) NOT NULL DEFAULT 'EXTERNAL' AFTER access_level,
    ADD COLUMN employee_center_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER audience,
    ADD COLUMN employee_assignment_policy VARCHAR(24) NOT NULL DEFAULT 'EXPLICIT' AFTER employee_center_enabled,
    ADD KEY idx_kiosk_definitions_employee_center (
        company_id, audience, employee_center_enabled, status
    );

UPDATE kiosk_definitions
SET audience = 'EMPLOYEE',
    employee_center_enabled = 1,
    employee_assignment_policy = 'EXPLICIT'
WHERE owner_module IN ('PROCESS_TASKS', 'HUMAN_RESOURCES', 'PETTY_CASH');

UPDATE kiosk_definitions
SET audience = CASE
        WHEN owner_module = 'PROCUREMENT' THEN 'PROVIDER'
        WHEN owner_module = 'EXPENSES' AND kiosk_type = 'accounts_payable' THEN 'PROVIDER'
        WHEN owner_module IN ('POINT_OF_SALE', 'SALES') THEN 'CUSTOMER'
        ELSE audience
    END,
    employee_center_enabled = 0
WHERE owner_module IN ('PROCUREMENT', 'EXPENSES', 'POINT_OF_SALE', 'SALES');

CREATE TABLE IF NOT EXISTS user_invitation_kiosk_assignments (
    invitation_id BIGINT NOT NULL,
    kiosk_definition_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (invitation_id, kiosk_definition_id),
    KEY idx_invitation_kiosk_definition (kiosk_definition_id),
    CONSTRAINT fk_invitation_kiosk_assignment_invitation
        FOREIGN KEY (invitation_id) REFERENCES user_invitations(id) ON DELETE CASCADE,
    CONSTRAINT fk_invitation_kiosk_assignment_definition
        FOREIGN KEY (kiosk_definition_id) REFERENCES kiosk_definitions(id) ON DELETE CASCADE
);
