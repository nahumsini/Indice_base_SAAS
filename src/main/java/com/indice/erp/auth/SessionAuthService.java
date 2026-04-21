package com.indice.erp.auth;

import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class SessionAuthService {

    public static final String SESSION_USER_ID = "auth.user.id";
    public static final String SESSION_COMPANY_ID = "auth.company.id";
    public static final String SESSION_USER_NAME = "auth.user.name";
    public static final String SESSION_ROLE = "auth.user.role";
    public static final String SESSION_LOGIN_CSRF = "auth.login.csrf";

    private final JdbcTemplate jdbcTemplate;
    private final BCryptPasswordEncoder passwordEncoder;

    public SessionAuthService(JdbcTemplate jdbcTemplate, BCryptPasswordEncoder passwordEncoder) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
    }

    public String ensureLoginCsrf(HttpSession session) {
        var existing = session.getAttribute(SESSION_LOGIN_CSRF);
        if (existing instanceof String token && !token.isBlank()) {
            return token;
        }

        var token = UUID.randomUUID().toString().replace("-", "");
        session.setAttribute(SESSION_LOGIN_CSRF, token);
        return token;
    }

    public LoginAttemptResult login(String email, String password, String csrf, HttpSession session) {
        var sessionCsrf = String.valueOf(session.getAttribute(SESSION_LOGIN_CSRF));
        if (sessionCsrf == null || sessionCsrf.isBlank() || !sessionCsrf.equals(csrf)) {
            return new LoginAttemptResult(false, "Invalid session. Refresh and try again.");
        }

        return authenticateAndStoreSession(email, password, session);
    }

    public LoginAttemptResult loginJson(String email, String password, HttpSession session) {
        return authenticateAndStoreSession(email, password, session);
    }

    private LoginAttemptResult authenticateAndStoreSession(String email, String password, HttpSession session) {

        var normalizedEmail = email == null ? "" : email.trim().toLowerCase();
        if (normalizedEmail.isBlank() || password == null || password.isBlank()) {
            return new LoginAttemptResult(false, "Invalid email or password.");
        }

        var users = jdbcTemplate.query(
            """
                SELECT id, email, password_hash, COALESCE(full_name, email) AS full_name
                FROM users
                WHERE LOWER(email) = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new DbUser(
                rs.getLong("id"),
                rs.getString("email"),
                rs.getString("password_hash"),
                rs.getString("full_name")
            ),
            normalizedEmail
        );

        if (users.isEmpty()) {
            return new LoginAttemptResult(false, "Invalid email or password.");
        }

        var user = users.getFirst();
        if (!matchesPassword(password, user.passwordHash())) {
            return new LoginAttemptResult(false, "Invalid email or password.");
        }

        var companies = jdbcTemplate.query(
            """
                SELECT company_id, role
                FROM user_companies
                WHERE user_id = ?
                  AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                ORDER BY CASE LOWER(COALESCE(role, 'user'))
                    WHEN 'root' THEN 1
                    WHEN 'superadmin' THEN 2
                    WHEN 'owner' THEN 3
                    WHEN 'dueno' THEN 4
                    WHEN 'admin' THEN 5
                    WHEN 'manager' THEN 6
                    WHEN 'approver' THEN 7
                    WHEN 'contributor' THEN 8
                    WHEN 'viewer' THEN 9
                    WHEN 'user' THEN 10
                    ELSE 99
                END,
                id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new CompanyRole(
                rs.getLong("company_id"),
                rs.getString("role")
            ),
            user.id()
        );

        if (companies.isEmpty()) {
            return new LoginAttemptResult(false, "No active company is assigned to this user.");
        }

        var companyRole = companies.getFirst();
        session.setAttribute(SESSION_USER_ID, user.id());
        session.setAttribute(SESSION_COMPANY_ID, companyRole.companyId());
        session.setAttribute(SESSION_USER_NAME, user.fullName());
        session.setAttribute(SESSION_ROLE, normalizeRole(companyRole.role()));

        return new LoginAttemptResult(true, "");
    }

    public Optional<AuthSessionUser> currentUser(HttpSession session) {
        var userId = session.getAttribute(SESSION_USER_ID);
        var companyId = session.getAttribute(SESSION_COMPANY_ID);

        if (!(userId instanceof Number userIdNumber) || !(companyId instanceof Number companyIdNumber)) {
            return Optional.empty();
        }

        var userName = String.valueOf(session.getAttribute(SESSION_USER_NAME));
        var role = normalizeRole(String.valueOf(session.getAttribute(SESSION_ROLE)));

        return Optional.of(new AuthSessionUser(
            userIdNumber.longValue(),
            companyIdNumber.longValue(),
            userName == null ? "" : userName,
            role
        ));
    }

    public Optional<AuthSessionResponse> currentSession(HttpSession session) {
        return currentUser(session).map(user -> new AuthSessionResponse(
            new AuthSessionResponse.UserInfo(user.userId(), user.userName(), user.role()),
            new AuthSessionResponse.CompanyInfo(user.companyId())
        ));
    }

    public void logout(HttpSession session) {
        session.invalidate();
    }

    private boolean matchesPassword(String rawPassword, String encodedPassword) {
        if (encodedPassword == null || encodedPassword.isBlank()) {
            return false;
        }

        var normalizedHash = encodedPassword.startsWith("$2y$")
            ? "$2a$" + encodedPassword.substring(4)
            : encodedPassword;

        try {
            return passwordEncoder.matches(rawPassword, normalizedHash);
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private String normalizeRole(String value) {
        return value == null ? null : value.trim().toLowerCase();
    }

    private record DbUser(
        Long id,
        String email,
        String passwordHash,
        String fullName
    ) {
    }

    private record CompanyRole(
        Long companyId,
        String role
    ) {
    }
}
