ALTER TABLE user_personal_performance_profiles
    DROP INDEX uq_user_personal_performance_profiles_user_version,
    ADD UNIQUE KEY uq_personal_performance_company_user_version (company_id, user_id, version),
    ADD KEY idx_personal_performance_company_user_status (company_id, user_id, status);
