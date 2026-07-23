package com.indice.erp.billing.stripe;

import com.indice.erp.auth.SignupPlanSelection;
import com.indice.erp.auth.SignupProfile;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class SignupIntentRepository {

    private final JdbcTemplate jdbcTemplate;

    SignupIntentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    java.util.List<SignupIntentRecord> findActivePendingByEmail(String email) {
        return jdbcTemplate.query(
            """
                SELECT *
                FROM signup_intents
                WHERE email = ?
                  AND status IN ('pending', 'checkout_created')
                  AND expires_at > UTC_TIMESTAMP()
                ORDER BY created_at DESC, id DESC
                """,
            this::map,
            email
        );
    }

    java.util.List<SignupIntentRecord> findExpiredCheckoutAttempts() {
        return jdbcTemplate.query(
            """
                SELECT *
                FROM signup_intents
                WHERE status IN ('pending', 'checkout_created', 'superseded', 'expired')
                  AND expires_at <= UTC_TIMESTAMP()
                ORDER BY created_at ASC, id ASC
                """,
            this::map
        );
    }

    long create(String token, SignupProfile profile, SignupPlanSelection plan, Instant expiresAt) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO signup_intents
                        (intent_token, full_name, email, password_hash, company_name, industry, company_size,
                         country, phone, plan_id, module_count, included_collaborators, extra_collaborators,
                         monthly_amount_cents, currency, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                Statement.RETURN_GENERATED_KEYS
            );
            bindCreate(statement, token, profile, plan, expiresAt);
            return statement;
        }, keyHolder);
        var key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Database did not return a signup intent id.");
        }
        return key.longValue();
    }

    void attachCheckout(long id, String sessionId, String customerId) {
        jdbcTemplate.update(
            """
                UPDATE signup_intents
                SET status = 'checkout_created',
                    stripe_checkout_session_id = ?,
                    stripe_customer_id = ?
                WHERE id = ?
                """,
            sessionId,
            customerId,
            id
        );
    }

    Optional<SignupIntentRecord> findByToken(String token) {
        return jdbcTemplate.query(
            "SELECT * FROM signup_intents WHERE intent_token = ?",
            this::map,
            token
        ).stream().findFirst();
    }

    Optional<SignupIntentRecord> findByCheckoutSessionId(String sessionId) {
        return jdbcTemplate.query(
            "SELECT * FROM signup_intents WHERE stripe_checkout_session_id = ?",
            this::map,
            sessionId
        ).stream().findFirst();
    }

    void markCompleted(long id, long companyId, String subscriptionId) {
        jdbcTemplate.update(
            """
                UPDATE signup_intents
                SET status = 'completed',
                    company_id = ?,
                    stripe_subscription_id = ?,
                    completed_at = UTC_TIMESTAMP(),
                    failure_message = NULL
                WHERE id = ?
                """,
            companyId,
            subscriptionId,
            id
        );
    }

    void markFailed(long id, String message) {
        jdbcTemplate.update(
            "UPDATE signup_intents SET status = 'failed', failure_message = ? WHERE id = ?",
            trim(message, 500),
            id
        );
    }

    int markSuperseded(long id) {
        return jdbcTemplate.update(
            """
                UPDATE signup_intents
                SET status = 'superseded',
                    failure_message = 'Replaced by a newer checkout attempt.'
                WHERE id = ?
                  AND status IN ('pending', 'checkout_created')
                """,
            id
        );
    }

    int markExpired(long id) {
        return jdbcTemplate.update(
            """
                UPDATE signup_intents
                SET status = 'expired',
                    failure_message = 'Checkout expired after 30 minutes. Start account setup again.'
                WHERE id = ?
                  AND status IN ('pending', 'checkout_created', 'superseded')
                """,
            id
        );
    }

    int deleteInactive(long id) {
        return jdbcTemplate.update(
            """
                DELETE FROM signup_intents
                WHERE id = ?
                  AND status IN ('superseded', 'expired')
                """,
            id
        );
    }

    private SignupIntentRecord map(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        var companyId = rs.getLong("company_id");
        Long companyIdValue = rs.wasNull() ? null : companyId;
        return new SignupIntentRecord(
            rs.getLong("id"),
            rs.getString("intent_token"),
            rs.getString("status"),
            new SignupProfile(
                rs.getString("full_name"),
                rs.getString("email"),
                rs.getString("password_hash"),
                rs.getString("company_name"),
                rs.getString("industry"),
                rs.getString("company_size"),
                rs.getString("country"),
                rs.getString("phone")
            ),
            new SignupPlanSelection(
                rs.getString("plan_id"),
                rs.getInt("module_count"),
                rs.getInt("included_collaborators"),
                rs.getInt("extra_collaborators"),
                rs.getInt("monthly_amount_cents"),
                rs.getString("currency"),
                java.util.List.of()
            ),
            rs.getString("stripe_checkout_session_id"),
            rs.getString("stripe_customer_id"),
            rs.getString("stripe_subscription_id"),
            companyIdValue,
            rs.getString("failure_message"),
            rs.getTimestamp("expires_at").toInstant()
        );
    }

    private void bindCreate(java.sql.PreparedStatement statement, String token, SignupProfile profile,
            SignupPlanSelection plan, Instant expiresAt) throws java.sql.SQLException {
        var values = new Object[] { token, profile.fullName(), profile.email(), profile.passwordHash(),
            profile.companyName(), profile.industry(), profile.companySize(), profile.country(), profile.phone(),
            plan.planId(), plan.moduleCount(), plan.includedCollaborators(), plan.extraCollaborators(),
            plan.monthlyAmountCents(), plan.currency(), Timestamp.from(expiresAt) };
        for (var index = 0; index < values.length; index += 1) {
            statement.setObject(index + 1, values[index]);
        }
    }

    private String trim(String value, int max) {
        var cleaned = value == null ? "" : value.trim();
        return cleaned.length() > max ? cleaned.substring(0, max) : cleaned;
    }
}
