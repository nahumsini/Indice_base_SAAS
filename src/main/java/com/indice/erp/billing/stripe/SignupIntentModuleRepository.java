package com.indice.erp.billing.stripe;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SignupIntentModuleRepository {

    private final JdbcTemplate jdbcTemplate;

    SignupIntentModuleRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void store(long signupIntentId, List<String> moduleSlugs) {
        for (var moduleSlug : moduleSlugs) {
            jdbcTemplate.update(
                """
                    INSERT INTO signup_intent_modules (signup_intent_id, module_slug)
                    SELECT ?, slug FROM modules WHERE slug = ? AND COALESCE(is_active, 1) = 1
                    ON DUPLICATE KEY UPDATE module_slug = VALUES(module_slug)
                    """,
                signupIntentId,
                moduleSlug
            );
        }
    }

    List<String> list(long signupIntentId) {
        return jdbcTemplate.query(
            """
                SELECT module_slug
                FROM signup_intent_modules
                WHERE signup_intent_id = ?
                ORDER BY id ASC
                """,
            (rs, rowNum) -> rs.getString("module_slug"),
            signupIntentId
        );
    }
}
