package com.indice.erp.auth;

import com.indice.erp.access.ModuleSlugNormalizer;
import com.indice.erp.billing.subscription.CompanySubscriptionStatus;
import com.indice.erp.billing.subscription.CompanySubscriptionStatusProvider;
import com.indice.erp.tenant.TenantScope;
import jakarta.servlet.http.HttpSession;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class SessionAuthService {

    public static final String SESSION_USER_ID = "auth.user.id";
    public static final String SESSION_COMPANY_ID = "auth.company.id";
    public static final String SESSION_USER_COMPANY_ID = "auth.user_company.id";
    public static final String SESSION_USER_NAME = "auth.user.name";
    public static final String SESSION_ROLE = "auth.user.role";
    public static final String SESSION_LOGIN_CSRF = "auth.login.csrf";
    public static final String SESSION_CREATED_AT = "auth.session.created_at";
    public static final String SESSION_LAST_SEEN_AT = "auth.session.last_seen_at";

    private final JdbcTemplate jdbcTemplate;
    private final BCryptPasswordEncoder passwordEncoder;
    private final LoginAuditService loginAuditService;
    private final CompanySubscriptionStatusProvider subscriptionStatusProvider;
    private final AuthSecurityProperties securityProperties;
    private final Clock clock;

    @Autowired
    public SessionAuthService(
        JdbcTemplate jdbcTemplate,
        BCryptPasswordEncoder passwordEncoder,
        LoginAuditService loginAuditService,
        CompanySubscriptionStatusProvider subscriptionStatusProvider,
        AuthSecurityProperties securityProperties,
        Clock clock
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.loginAuditService = loginAuditService;
        this.subscriptionStatusProvider = subscriptionStatusProvider;
        this.securityProperties = securityProperties;
        this.clock = clock;
    }

    SessionAuthService(JdbcTemplate jdbcTemplate, BCryptPasswordEncoder passwordEncoder) {
        this(
            jdbcTemplate,
            passwordEncoder,
            LoginAuditService.noop(),
            (companyId) -> CompanySubscriptionStatus.activeLegacy(),
            new AuthSecurityProperties(),
            Clock.systemUTC()
        );
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

    public LoginAttemptResult login(String companyName, String email, String password, String csrf, HttpSession session) {
        var sessionToken = session.getAttribute(SESSION_LOGIN_CSRF);
        var sessionCsrf = sessionToken instanceof String value ? value : "";
        if (sessionCsrf.isBlank() || !sessionCsrf.equals(csrf)) {
            return new LoginAttemptResult(false, "Invalid session. Refresh and try again.");
        }

        return authenticateAndStoreSession(companyName, email, password, session, LoginAuditContext.empty());
    }

    public LoginAttemptResult loginJson(String companyName, String email, String password, HttpSession session) {
        return loginJson(companyName, email, password, session, LoginAuditContext.empty());
    }

    public LoginAttemptResult loginJson(String companyName, String email, String password, HttpSession session, LoginAuditContext auditContext) {
        return authenticateAndStoreSession(companyName, email, password, session, auditContext);
    }

    public LoginCredentialVerificationResult verifyLoginCredentials(
        String companyName,
        String email,
        String password
    ) {
        var normalizedEmail = normalizeEmail(email);
        var normalizedCompanyName = normalizeCompanyName(companyName);
        if (normalizedCompanyName.isBlank()) {
            return LoginCredentialVerificationResult.failure(
                "Company name is required.",
                AuthFailureReason.MISSING_COMPANY,
                normalizedEmail,
                normalizedCompanyName,
                null,
                null,
                null,
                null
            );
        }
        if (normalizedEmail.isBlank() || password == null || password.isBlank()) {
            return LoginCredentialVerificationResult.failure(
                "Invalid company, email, or password.",
                AuthFailureReason.MISSING_EMAIL_OR_PASSWORD,
                normalizedEmail,
                normalizedCompanyName,
                null,
                null,
                null,
                null
            );
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
            return LoginCredentialVerificationResult.failure(
                "Invalid company, email, or password.",
                AuthFailureReason.USER_NOT_FOUND,
                normalizedEmail,
                normalizedCompanyName,
                null,
                null,
                null,
                null
            );
        }

        var user = users.getFirst();
        if (!matchesPassword(password, user.passwordHash())) {
            return LoginCredentialVerificationResult.failure(
                "Invalid company, email, or password.",
                AuthFailureReason.PASSWORD_INVALID,
                normalizedEmail,
                normalizedCompanyName,
                user.id(),
                null,
                null,
                null
            );
        }

        var companies = jdbcTemplate.query(
            """
                SELECT uc.id, uc.company_id, uc.role
                FROM user_companies uc
                JOIN companies c ON c.id = uc.company_id
                WHERE uc.user_id = ?
                  AND LOWER(TRIM(c.name)) = ?
                  AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                ORDER BY CASE LOWER(COALESCE(uc.role, 'user'))
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
                uc.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new CompanyRole(
                rs.getLong("id"),
                rs.getLong("company_id"),
                rs.getString("role")
            ),
            user.id(),
            normalizedCompanyName
        );

        if (companies.isEmpty()) {
            var companyId = resolveCompanyId(normalizedCompanyName);
            return LoginCredentialVerificationResult.failure(
                "Invalid company, email, or password.",
                companyId == null ? AuthFailureReason.COMPANY_NOT_FOUND : AuthFailureReason.MEMBERSHIP_NOT_FOUND,
                normalizedEmail,
                normalizedCompanyName,
                user.id(),
                companyId,
                null,
                null
            );
        }

        var companyRole = companies.getFirst();
        var login = new AuthenticatedLogin(
            user.id(),
            companyRole.companyId(),
            companyRole.userCompanyId(),
            user.fullName(),
            normalizedEmail,
            companyName == null ? normalizedCompanyName : companyName.trim(),
            normalizeRole(companyRole.role())
        );
        return LoginCredentialVerificationResult.success(login, normalizedEmail, normalizedCompanyName);
    }

    public void storeAuthenticatedSession(HttpSession session, AuthenticatedLogin login) {
        var role = normalizeRole(login.role());
        session.setAttribute(SESSION_USER_ID, login.userId());
        session.setAttribute(SESSION_COMPANY_ID, login.companyId());
        session.setAttribute(SESSION_USER_COMPANY_ID, login.userCompanyId());
        session.setAttribute(SESSION_USER_NAME, login.fullName());
        session.setAttribute(SESSION_ROLE, role);
        var now = clock.instant();
        session.setAttribute(SESSION_CREATED_AT, now);
        session.setAttribute(SESSION_LAST_SEEN_AT, now);
        applySessionIdleTimeout(session, role);
    }

    public boolean enforceSessionTimeout(HttpSession session, LoginAuditContext auditContext) {
        var userId = session.getAttribute(SESSION_USER_ID);
        if (!(userId instanceof Number userIdNumber)) {
            return true;
        }
        var now = clock.instant();
        var createdAt = sessionInstant(session.getAttribute(SESSION_CREATED_AT), now);
        var lastSeenAt = sessionInstant(session.getAttribute(SESSION_LAST_SEEN_AT), now);
        var role = sessionRole(session);
        var idleTimeoutSeconds = securityProperties.getSessionIdleTimeoutSecondsForRole(role);
        session.setMaxInactiveInterval(idleTimeoutSeconds);
        var absoluteExpired = createdAt.plus(Duration.ofSeconds(securityProperties.getSessionAbsoluteTimeoutSeconds())).isBefore(now);
        var idleExpired = lastSeenAt.plus(Duration.ofSeconds(idleTimeoutSeconds)).isBefore(now);
        if (absoluteExpired || idleExpired) {
            var companyId = session.getAttribute(SESSION_COMPANY_ID);
            var userCompanyId = session.getAttribute(SESSION_USER_COMPANY_ID);
            loginAuditService.record(LoginAuditEvent.builder()
                .eventType("SESSION_TIMEOUT")
                .stage("SESSION")
                .outcome("BLOCKED")
                .userId(userIdNumber.longValue())
                .companyId(companyId instanceof Number companyNumber ? companyNumber.longValue() : null)
                .userCompanyId(userCompanyId instanceof Number membershipNumber ? membershipNumber.longValue() : null)
                .role(role)
                .failureReasonCode(absoluteExpired
                    ? AuthFailureReason.SESSION_ABSOLUTE_TIMEOUT
                    : AuthFailureReason.SESSION_IDLE_TIMEOUT)
                .failureMessageSafe("Authenticated session expired.")
                .context(auditContext)
                .build());
            logout(session);
            return false;
        }
        session.setAttribute(SESSION_CREATED_AT, createdAt);
        session.setAttribute(SESSION_LAST_SEEN_AT, now);
        return true;
    }

    private LoginAttemptResult authenticateAndStoreSession(
        String companyName,
        String email,
        String password,
        HttpSession session,
        LoginAuditContext auditContext
    ) {
        var result = verifyLoginCredentials(companyName, email, password);
        if (!result.success()) {
            recordLogin(result.emailNormalized(), result.userId(), result.companyId(), result.role(), false, result.message(), auditContext);
            return new LoginAttemptResult(false, result.message());
        }

        storeAuthenticatedSession(session, result.login());
        recordLogin(result.emailNormalized(), result.userId(), result.companyId(), result.role(), true, "", auditContext);

        return new LoginAttemptResult(true, "");
    }

    public Optional<AuthSessionUser> currentUser(HttpSession session) {
        if (!enforceSessionTimeout(session, LoginAuditContext.empty())) {
            return Optional.empty();
        }
        var userId = session.getAttribute(SESSION_USER_ID);
        var companyId = session.getAttribute(SESSION_COMPANY_ID);

        if (!(userId instanceof Number userIdNumber) || !(companyId instanceof Number companyIdNumber)) {
            return Optional.empty();
        }

        var activeAccess = loadActiveSessionAccess(userIdNumber.longValue(), companyIdNumber.longValue());
        if (activeAccess.isEmpty()) {
            logout(session);
            return Optional.empty();
        }

        var userName = String.valueOf(session.getAttribute(SESSION_USER_NAME));
        var role = normalizeRole(activeAccess.get().role());
        session.setAttribute(SESSION_USER_COMPANY_ID, activeAccess.get().userCompanyId());
        session.setAttribute(SESSION_ROLE, role);
        applySessionIdleTimeout(session, role);

        return Optional.of(new AuthSessionUser(
            userIdNumber.longValue(),
            companyIdNumber.longValue(),
            activeAccess.get().userCompanyId(),
            userName == null ? "" : userName,
            role
        ));
    }

    public Optional<AuthSessionResponse> currentSession(HttpSession session) {
        return currentUser(session).map(user -> {
            var access = loadSessionAccess(user.userId(), user.companyId());
            var memberships = loadActiveCompanyMemberships(user.userId()).stream()
                .map(membership -> toCompanyInfo(membership, membership.companyId() == user.companyId()))
                .toList();
            var activeCompany = memberships.stream()
                .filter(AuthSessionResponse.CompanyInfo::active)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("The active company membership could not be loaded."));
            return new AuthSessionResponse(
                new AuthSessionResponse.UserInfo(
                    user.userId(),
                    user.userName(),
                    user.role(),
                    access.moduleSlugs(),
                    access.tabPermissionKeys(),
                    access.tabPermissionsConfigured()
                ),
                activeCompany,
                memberships
            );
        });
    }

    public boolean switchActiveCompany(HttpSession session, long companyId) {
        var userId = session.getAttribute(SESSION_USER_ID);
        if (!(userId instanceof Number userIdNumber)) {
            return false;
        }

        var membership = loadActiveCompanyMemberships(userIdNumber.longValue()).stream()
            .filter(candidate -> candidate.companyId() == companyId)
            .findFirst();
        if (membership.isEmpty()) {
            return false;
        }

        session.setAttribute(SESSION_COMPANY_ID, membership.get().companyId());
        session.setAttribute(SESSION_USER_COMPANY_ID, membership.get().userCompanyId());
        var role = normalizeRole(membership.get().role());
        session.setAttribute(SESSION_ROLE, role);
        applySessionIdleTimeout(session, role);
        return true;
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

    private String sessionRole(HttpSession session) {
        var role = session.getAttribute(SESSION_ROLE);
        return role instanceof String value ? normalizeRole(value) : null;
    }

    private void applySessionIdleTimeout(HttpSession session, String role) {
        session.setMaxInactiveInterval(securityProperties.getSessionIdleTimeoutSecondsForRole(role));
    }

    private String normalizeEmail(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private String normalizeCompanyName(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private Long resolveCompanyId(String normalizedCompanyName) {
        var ids = jdbcTemplate.query(
            "SELECT id FROM companies WHERE LOWER(TRIM(name)) = ? LIMIT 1",
            (rs, rowNum) -> rs.getLong("id"),
            normalizedCompanyName
        );
        return ids.isEmpty() ? null : ids.getFirst();
    }

    private Instant sessionInstant(Object value, Instant fallback) {
        if (value instanceof Instant instant) {
            return instant;
        }
        if (value instanceof String stringValue) {
            try {
                return Instant.parse(stringValue);
            } catch (RuntimeException ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    private Optional<CompanyRole> loadActiveSessionAccess(long userId, long companyId) {
        return jdbcTemplate.query(
            """
                SELECT id, COALESCE(role, 'user') AS role
                FROM user_companies
                WHERE user_id = ?
                  AND company_id = ?
                  AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                LIMIT 1
                """,
            (rs, rowNum) -> new CompanyRole(rs.getLong("id"), companyId, rs.getString("role")),
            userId,
            companyId
        ).stream().findFirst();
    }

    private List<CompanyMembership> loadActiveCompanyMemberships(long userId) {
        return jdbcTemplate.query(
            """
                SELECT
                    uc.id AS user_company_id,
                    uc.company_id,
                    COALESCE(c.name, CONCAT('Company #', uc.company_id)) AS company_name,
                    COALESCE(c.commercial_account_type, 'SUPER_ADMIN') AS commercial_account_type,
                    COALESCE(uc.role, 'user') AS role,
                    wp.unit_id,
                    wp.business_id
                FROM user_companies uc
                JOIN companies c ON c.id = uc.company_id
                LEFT JOIN user_work_profiles wp
                  ON wp.company_id = uc.company_id
                 AND wp.user_company_id = uc.id
                WHERE uc.user_id = ?
                  AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                ORDER BY CASE LOWER(COALESCE(uc.role, 'user'))
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
                c.name ASC,
                uc.id ASC
                """,
            (rs, rowNum) -> new CompanyMembership(
                rs.getLong("user_company_id"),
                rs.getLong("company_id"),
                rs.getString("company_name"),
                rs.getString("commercial_account_type"),
                rs.getString("role"),
                rs.getObject("unit_id", Long.class),
                rs.getObject("business_id", Long.class)
            ),
            userId
        );
    }

    private AuthSessionResponse.CompanyInfo toCompanyInfo(CompanyMembership membership, boolean active) {
        var scope = TenantScope.from(membership.unitId(), membership.businessId());
        return new AuthSessionResponse.CompanyInfo(
            membership.companyId(),
            membership.companyName(),
            membership.commercialAccountType() == null ? "SUPER_ADMIN" : membership.commercialAccountType(),
            membership.userCompanyId(),
            normalizeRole(membership.role()),
            new AuthSessionResponse.ScopeInfo(scope.type(), scope.unit_id(), scope.business_id()),
            active,
            subscriptionInfo(subscriptionStatusProvider.currentStatus(membership.companyId()))
        );
    }

    private void recordLogin(
        String email,
        Long userId,
        Long companyId,
        String role,
        boolean success,
        String reason,
        LoginAuditContext auditContext
    ) {
        loginAuditService.record(email, userId, companyId, normalizeRole(role), success, reason, auditContext);
    }

    private SessionAccess loadSessionAccess(long userId, long companyId) {
        var userCompanyIds = jdbcTemplate.query(
            """
                SELECT id
                FROM user_companies
                WHERE user_id = ?
                  AND company_id = ?
                  AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            userId,
            companyId
        );

        if (userCompanyIds.isEmpty()) {
            return new SessionAccess(List.of(), List.of(), false);
        }

        var userCompanyId = userCompanyIds.getFirst();
        var entitledModules = new LinkedHashSet<>(jdbcTemplate.query(
            """
                SELECT DISTINCT module_slug
                FROM company_module_entitlements
                WHERE company_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                ORDER BY module_slug ASC
                """,
            (rs, rowNum) -> ModuleSlugNormalizer.normalize(rs.getString("module_slug")),
            companyId
        ));
        var moduleSlugs = new ArrayList<>(new LinkedHashSet<>(jdbcTemplate.query(
            """
                SELECT DISTINCT module_slug
                FROM user_company_module_roles
                WHERE user_company_id = ?
                ORDER BY module_slug ASC
                """,
            (rs, rowNum) -> ModuleSlugNormalizer.normalize(rs.getString("module_slug")),
            userCompanyId
        )));
        moduleSlugs.removeIf((moduleSlug) -> !entitledModules.contains(moduleSlug));
        var tabPermissionKeys = new ArrayList<>(new LinkedHashSet<>(jdbcTemplate.query(
            """
                SELECT module_slug, tab_key
                FROM user_company_tab_permissions
                WHERE user_company_id = ?
                  AND can_view = 1
                ORDER BY module_slug ASC, tab_key ASC
                """,
            (rs, rowNum) -> ModuleSlugNormalizer.normalize(rs.getString("module_slug")) + "." + rs.getString("tab_key"),
            userCompanyId
        )));
        var tabPermissionRowCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM user_company_tab_permissions WHERE user_company_id = ?",
            Long.class,
            userCompanyId
        );

        return new SessionAccess(
            moduleSlugs,
            tabPermissionKeys,
            tabPermissionRowCount != null && tabPermissionRowCount > 0
        );
    }

    private String loadCompanyName(long companyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT name
                FROM companies
                WHERE id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getString("name"),
            companyId
        );
        return rows.isEmpty() ? "" : rows.getFirst();
    }

    private AuthSessionResponse.SubscriptionInfo subscriptionInfo(CompanySubscriptionStatus status) {
        return new AuthSessionResponse.SubscriptionInfo(
            status.status(),
            status.planId(),
            status.trialEndAt() == null ? "" : status.trialEndAt().toString(),
            status.accessAllowed(),
            status.lockReason()
        );
    }

    private record DbUser(
        Long id,
        String email,
        String passwordHash,
        String fullName
    ) {
    }

    private record CompanyRole(
        Long userCompanyId,
        Long companyId,
        String role
    ) {
    }

    private record CompanyMembership(
        long userCompanyId,
        long companyId,
        String companyName,
        String commercialAccountType,
        String role,
        Long unitId,
        Long businessId
    ) {
        private CompanyMembership(
            long userCompanyId,
            long companyId,
            String companyName,
            String role,
            Long unitId,
            Long businessId
        ) {
            this(userCompanyId, companyId, companyName, "SUPER_ADMIN", role, unitId, businessId);
        }
    }

    private record SessionAccess(
        List<String> moduleSlugs,
        List<String> tabPermissionKeys,
        boolean tabPermissionsConfigured
    ) {
    }
}
