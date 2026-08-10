ALTER TABLE company_business_profiles
    ADD COLUMN subject_user_id BIGINT NULL AFTER company_id;

UPDATE company_business_profiles
SET subject_user_id = COALESCE(created_by, updated_by)
WHERE subject_user_id IS NULL;

ALTER TABLE company_business_profiles
    DROP INDEX uq_company_business_profiles_company_version,
    ADD UNIQUE KEY uq_company_business_profiles_subject_version (company_id, subject_user_id, version),
    ADD KEY idx_company_business_profiles_subject_status (company_id, subject_user_id, status),
    ADD CONSTRAINT fk_company_business_profiles_subject_user
        FOREIGN KEY (subject_user_id) REFERENCES users (id) ON DELETE CASCADE;
