package com.indice.erp.ai.oauth;

import com.indice.erp.auth.AuthSessionUser;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AiOAuthUserInfoRepository {

    private final JdbcTemplate jdbcTemplate;

    public AiOAuthUserInfoRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<UserInfo> find(AuthSessionUser user) {
        if (user == null || user.userId() == null || user.companyId() == null) return Optional.empty();
        return jdbcTemplate.query(
            """
                SELECT account.email,
                       (
                           EXISTS (
                               SELECT 1
                               FROM billing_signup_intents signup
                               WHERE signup.owner_user_id = account.id
                                 AND signup.company_id = ?
                                 AND signup.email_verified_at IS NOT NULL
                                 AND CONVERT(LOWER(signup.email_normalized) USING utf8mb4) COLLATE utf8mb4_unicode_ci
                                     = CONVERT(LOWER(account.email) USING utf8mb4) COLLATE utf8mb4_unicode_ci
                           )
                           OR EXISTS (
                               SELECT 1
                               FROM user_invitations invitation
                               WHERE invitation.company_id = ?
                                 AND CONVERT(LOWER(invitation.email) USING utf8mb4) COLLATE utf8mb4_unicode_ci
                                     = CONVERT(LOWER(account.email) USING utf8mb4) COLLATE utf8mb4_unicode_ci
                                 AND LOWER(COALESCE(invitation.status, '')) = 'accepted'
                           )
                           OR EXISTS (
                               SELECT 1
                               FROM auth_mfa_challenges challenge
                               WHERE challenge.user_id = account.id
                                 AND challenge.company_id = ?
                                 AND CONVERT(LOWER(challenge.email_normalized) USING utf8mb4) COLLATE utf8mb4_unicode_ci
                                     = CONVERT(LOWER(account.email) USING utf8mb4) COLLATE utf8mb4_unicode_ci
                                 AND UPPER(COALESCE(challenge.status, '')) = 'USED'
                                 AND challenge.used_at IS NOT NULL
                           )
                       ) AS email_verified
                FROM users account
                WHERE account.id = ?
                  AND account.email IS NOT NULL
                  AND TRIM(account.email) <> ''
                LIMIT 1
                """,
            (rs, rowNum) -> new UserInfo(
                rs.getString("email"),
                rs.getBoolean("email_verified")
            ),
            user.companyId(),
            user.companyId(),
            user.companyId(),
            user.userId()
        ).stream().findFirst();
    }

    public record UserInfo(String email, boolean emailVerified) { }
}
