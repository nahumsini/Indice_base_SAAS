package com.indice.erp.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.platformadmin.PlatformAdminService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
    "app.auth.mfa-enabled=true",
    "app.auth.mfa-required=true",
    "app.auth.mfa-otp-hash-secret=test-only-auth-login-security-secret",
    "app.auth.mfa-max-attempts=5",
    "app.auth.mfa-resend-cooldown-seconds=30",
    "app.auth.mfa-send-max-requests=5",
    "app.auth.login-lockout-attempts=5",
    "app.auth.login-lockout-minutes=30",
    "app.entitlements.enforcement-enabled=false",
    "app.entitlements.projection-enabled=false"
})
@AutoConfigureMockMvc
class AuthLoginSecurityIntegrationTest {

    private static final String EMAIL_PREFIX = "auth-login-security-";
    private static final String COMPANY_PREFIX = "auth-login-security-";
    private static final String PASSWORD = "Indice-Access-2026!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private PlatformAdminService platformAdminService;

    @Autowired
    private AuthSessionTimeoutInterceptor sessionTimeoutInterceptor;

    @MockBean
    private LoginOtpEmailService emailService;

    private final AtomicReference<String> deliveredOtp = new AtomicReference<>();

    @BeforeEach
    void setUp() {
        cleanTestState();
        deliveredOtp.set(null);
        given(emailService.sendOtp(any(AuthenticatedLogin.class), anyString(), anyInt()))
            .willAnswer(invocation -> {
                deliveredOtp.set(invocation.getArgument(1));
                return LoginOtpEmailService.DeliveryResult.sentResult();
            });
    }

    @AfterEach
    void clean() {
        cleanTestState();
    }

    @Test
    void productionContextCreatesSessionTimeoutInterceptor() {
        assertThat(sessionTimeoutInterceptor).isNotNull();
    }

    @Test
    void fullLoginFlowRequiresOtpBeforeSessionAndWritesSearchableAuditRows() throws Exception {
        var account = createAccount();
        var csrf = csrf();

        var loginResult = mockMvc.perform(post("/api/v1/auth/login")
                .session(csrf.session())
                .header("X-CSRF-Token", csrf.token())
                .contentType(APPLICATION_JSON)
                .content(loginPayload(account.companyName(), account.email(), PASSWORD)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mfaRequired").value(true))
            .andExpect(jsonPath("$.maskedDestination").value(masked(account.email())))
            .andExpect(jsonPath("$.challengeId").isString())
            .andReturn();

        assertThat(loginResult.getRequest().getSession(false).getAttribute(SessionAuthService.SESSION_USER_ID)).isNull();
        assertThat(deliveredOtp.get()).matches("\\d{6}");

        var challengeId = objectMapper.readTree(loginResult.getResponse().getContentAsString())
            .get("challengeId")
            .asText();

        mockMvc.perform(post("/api/v1/auth/login/otp/verify")
                .session(csrf.session())
                .header("X-CSRF-Token", csrf.token())
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "challengeId": "%s",
                      "otpCode": "%s"
                    }
                    """.formatted(challengeId, deliveredOtp.get())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.id").value(account.userId()))
            .andExpect(jsonPath("$.company.id").value(account.companyId()))
            .andExpect(jsonPath("$.company.name").value(account.companyName()))
            .andExpect(jsonPath("$.csrfToken").isString());

        assertThat(auditEvents(account.email())).contains(
            "LOGIN:PASSWORD:SUCCESS:MFA_REQUIRED",
            "MFA_CHALLENGE:MFA:SUCCESS:MFA_REQUIRED",
            "MFA_VERIFY:MFA:SUCCESS:"
        );

        jdbc.update(
            "INSERT INTO platform_administrators (user_id, platform_role, status, mfa_required, created_by_user_id) VALUES (?, 'PLATFORM_ROOT', 'ACTIVE', 0, ?)",
            account.userId(),
            account.userId()
        );
        @SuppressWarnings("unchecked")
        var events = (List<Map<String, Object>>) platformAdminService.audit(account.userId(), 50).get("events");
        assertThat(events).anySatisfy(event -> {
            assertThat(event).containsEntry("category", "AUTH_LOGIN");
            assertThat(String.valueOf(event.get("detail_json"))).contains(account.email().toLowerCase());
        });
    }

    @Test
    void fiveWrongPasswordAttemptsLockLoginBeforeMfaCanStart() throws Exception {
        var account = createAccount();
        var csrf = csrf();

        for (int attempt = 1; attempt < 5; attempt++) {
            mockMvc.perform(post("/api/v1/auth/login")
                    .session(csrf.session())
                    .header("X-CSRF-Token", csrf.token())
                    .contentType(APPLICATION_JSON)
                    .content(loginPayload(account.companyName(), account.email(), "wrong-" + attempt)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid company, email, or password."));
        }

        mockMvc.perform(post("/api/v1/auth/login")
                .session(csrf.session())
                .header("X-CSRF-Token", csrf.token())
                .contentType(APPLICATION_JSON)
                .content(loginPayload(account.companyName(), account.email(), "wrong-5")))
            .andExpect(status().isLocked())
            .andExpect(jsonPath("$.message").value("Invalid login or account temporarily locked."));

        mockMvc.perform(post("/api/v1/auth/login")
                .session(csrf.session())
                .header("X-CSRF-Token", csrf.token())
                .contentType(APPLICATION_JSON)
                .content(loginPayload(account.companyName(), account.email(), PASSWORD)))
            .andExpect(status().isLocked())
            .andExpect(jsonPath("$.message").value("Invalid login or account temporarily locked."));

        verify(emailService, never()).sendOtp(any(AuthenticatedLogin.class), anyString(), anyInt());
        assertThat(lockoutFailureCount(account.email())).isEqualTo(5);
        assertThat(lockoutUntilIsSet(account.email())).isTrue();
        assertThat(auditReasonCount(account.email(), AuthFailureReason.PASSWORD_INVALID)).isEqualTo(5);
        assertThat(auditReasonCount(account.email(), AuthFailureReason.ACCOUNT_LOCKED)).isEqualTo(1);
    }

    @Test
    void fiveWrongOtpAttemptsLockChallengeAndAccount() throws Exception {
        var account = createAccount();
        var csrf = csrf();

        var loginResult = mockMvc.perform(post("/api/v1/auth/login")
                .session(csrf.session())
                .header("X-CSRF-Token", csrf.token())
                .contentType(APPLICATION_JSON)
                .content(loginPayload(account.companyName(), account.email(), PASSWORD)))
            .andExpect(status().isOk())
            .andReturn();
        var challengeId = objectMapper.readTree(loginResult.getResponse().getContentAsString())
            .get("challengeId")
            .asText();

        for (int attempt = 1; attempt < 5; attempt++) {
            mockMvc.perform(post("/api/v1/auth/login/otp/verify")
                    .session(csrf.session())
                    .header("X-CSRF-Token", csrf.token())
                    .contentType(APPLICATION_JSON)
                    .content(otpPayload(challengeId, "000000")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid verification code or account temporarily locked."));
        }

        mockMvc.perform(post("/api/v1/auth/login/otp/verify")
                .session(csrf.session())
                .header("X-CSRF-Token", csrf.token())
                .contentType(APPLICATION_JSON)
                .content(otpPayload(challengeId, "000000")))
            .andExpect(status().isLocked())
            .andExpect(jsonPath("$.message").value("Invalid verification code or account temporarily locked."));

        assertThat(challengeStatus(challengeId)).isEqualTo("LOCKED");
        assertThat(lockoutUntilIsSet(account.email())).isTrue();
        assertThat(auditReasonCount(account.email(), AuthFailureReason.MFA_OTP_INVALID)).isEqualTo(4);
        assertThat(auditReasonCount(account.email(), AuthFailureReason.MFA_OTP_LOCKED)).isGreaterThanOrEqualTo(1);
    }

    private CsrfState csrf() throws Exception {
        var result = mockMvc.perform(get("/api/v1/auth/csrf"))
            .andExpect(status().isOk())
            .andReturn();
        var token = objectMapper.readTree(result.getResponse().getContentAsString())
            .get("csrfToken")
            .asText();
        return new CsrfState((MockHttpSession) result.getRequest().getSession(false), token);
    }

    private AuthAccount createAccount() {
        var discriminator = UUID.randomUUID().toString();
        var email = EMAIL_PREFIX + discriminator + "@example.com";
        var company = COMPANY_PREFIX + discriminator;
        jdbc.update("INSERT INTO companies (name) VALUES (?)", company);
        var companyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, 'Auth Login User')",
            email,
            passwordEncoder.encode(PASSWORD)
        );
        var userId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, 'admin', 'active', 'all')",
            userId,
            companyId
        );
        var userCompanyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        return new AuthAccount(userId, companyId, userCompanyId, email, company);
    }

    private List<String> auditEvents(String email) {
        return jdbc.queryForList(
            """
                SELECT CONCAT(event_type, ':', stage, ':', outcome, ':', COALESCE(failure_reason_code, ''))
                FROM user_login_audit
                WHERE email_normalized = ?
                ORDER BY id
                """,
            String.class,
            email.toLowerCase()
        );
    }

    private int auditReasonCount(String email, String reasonCode) {
        return jdbc.queryForObject(
            "SELECT COUNT(*) FROM user_login_audit WHERE email_normalized = ? AND failure_reason_code = ?",
            Integer.class,
            email.toLowerCase(),
            reasonCode
        );
    }

    private int lockoutFailureCount(String email) {
        return jdbc.queryForObject(
            "SELECT failure_count FROM auth_login_lockouts WHERE email_normalized = ?",
            Integer.class,
            email.toLowerCase()
        );
    }

    private boolean lockoutUntilIsSet(String email) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT locked_until IS NOT NULL FROM auth_login_lockouts WHERE email_normalized = ?",
            Boolean.class,
            email.toLowerCase()
        ));
    }

    private String challengeStatus(String challengeId) {
        return jdbc.queryForObject(
            "SELECT status FROM auth_mfa_challenges WHERE challenge_reference = ?",
            String.class,
            challengeId
        );
    }

    private String loginPayload(String company, String email, String password) {
        return """
            {
              "companyName": "%s",
              "email": "%s",
              "password": "%s"
            }
            """.formatted(company, email, password);
    }

    private String otpPayload(String challengeId, String otpCode) {
        return """
            {
              "challengeId": "%s",
              "otpCode": "%s"
            }
            """.formatted(challengeId, otpCode);
    }

    private String masked(String email) {
        var at = email.indexOf('@');
        return email.charAt(0) + "***" + email.substring(at);
    }

    private void cleanTestState() {
        jdbc.update("DELETE FROM platform_administrators WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM auth_mfa_challenges WHERE email_normalized LIKE ?", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM auth_rate_limit_buckets WHERE email_normalized LIKE ?", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM auth_login_lockouts WHERE email_normalized LIKE ?", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM user_login_audit WHERE email_normalized LIKE ? OR email LIKE ?", EMAIL_PREFIX + "%", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM user_companies WHERE company_id IN (SELECT id FROM companies WHERE name LIKE ?)", COMPANY_PREFIX + "%");
        jdbc.update("DELETE FROM users WHERE email LIKE ?", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", COMPANY_PREFIX + "%");
    }

    private record CsrfState(MockHttpSession session, String token) {
    }

    private record AuthAccount(long userId, long companyId, long userCompanyId, String email, String companyName) {
    }
}
