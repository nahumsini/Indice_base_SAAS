package com.indice.erp.ai.oauth;

import static org.assertj.core.api.Assertions.assertThat;

import com.indice.erp.auth.AuthSessionUser;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(AiOAuthUserInfoRepository.class)
class AiOAuthUserInfoRepositoryIntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private AiOAuthUserInfoRepository repository;

    @Test
    void treatsACompletedEmailMfaChallengeAsVerifiedOwnership() {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var email = "oauth-userinfo-" + suffix + "@example.com";
        jdbc.update("INSERT INTO companies (name) VALUES (?)", "OAuth UserInfo " + suffix);
        var companyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, 'test-hash', 'OAuth Test')",
            email
        );
        var userId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO user_companies (user_id, company_id, role, status, visibility) "
                + "VALUES (?, ?, 'admin', 'active', 'all')",
            userId,
            companyId
        );
        var userCompanyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        var user = new AuthSessionUser(userId, companyId, userCompanyId, "OAuth Test", "admin");

        assertThat(repository.find(user)).get()
            .returns(email, AiOAuthUserInfoRepository.UserInfo::email)
            .returns(false, AiOAuthUserInfoRepository.UserInfo::emailVerified);

        var now = Instant.parse("2026-09-01T16:00:00Z");
        jdbc.update(
            """
                INSERT INTO auth_mfa_challenges (
                    challenge_reference, session_id_hash, user_id, company_id, user_company_id,
                    role, full_name, email_normalized, company_name_normalized, company_name,
                    otp_hash, destination_hint, status, attempt_count, max_attempts,
                    resend_count, last_sent_at, expires_at, used_at
                ) VALUES (?, ?, ?, ?, ?, 'admin', 'OAuth Test', ?, ?, ?, ?, ?, 'USED', 0, 5, 0, ?, ?, ?)
                """,
            randomReference(),
            randomReference(),
            userId,
            companyId,
            userCompanyId,
            email,
            "oauth userinfo " + suffix,
            "OAuth UserInfo " + suffix,
            "c".repeat(64),
            "o***@example.com",
            Timestamp.from(now.minusSeconds(60)),
            Timestamp.from(now.plusSeconds(240)),
            Timestamp.from(now)
        );

        assertThat(repository.find(user)).get()
            .returns(email, AiOAuthUserInfoRepository.UserInfo::email)
            .returns(true, AiOAuthUserInfoRepository.UserInfo::emailVerified);
    }

    private String randomReference() {
        return UUID.randomUUID().toString().replace("-", "")
            + UUID.randomUUID().toString().replace("-", "");
    }
}
