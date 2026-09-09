package com.indice.erp.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
    "app.auth.local-mfa-bypass-enabled=true",
    "app.auth.mfa-required=false",
    "server.address=127.0.0.1",
    "app.web.public-url=http://localhost:5173",
    "app.local-demo-login.enabled=false",
    "app.email.enabled=false",
    "app.entitlements.enforcement-enabled=false",
    "app.entitlements.projection-enabled=false"
})
@ActiveProfiles("local")
@AutoConfigureMockMvc
class LocalDevelopmentLoginIntegrationTest {

    private static final String PREFIX = "local-auth-policy-test-";
    private static final String PASSWORD = "Local-Test-Only-Password-2026!";

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private BCryptPasswordEncoder passwordEncoder;
    @Autowired private SessionAuthService auth;
    @MockitoBean private LoginOtpEmailService otpEmail;
    @MockitoBean private LoginSecurityEmailService securityEmail;

    @BeforeEach
    @AfterEach
    void cleanup() {
        jdbc.update("DELETE FROM platform_administrators WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)", PREFIX + "%");
        jdbc.update("DELETE FROM auth_mfa_challenges WHERE email_normalized LIKE ?", PREFIX + "%");
        jdbc.update("DELETE FROM auth_rate_limit_buckets WHERE email_normalized LIKE ?", PREFIX + "%");
        jdbc.update("DELETE FROM auth_login_lockouts WHERE email_normalized LIKE ?", PREFIX + "%");
        jdbc.update("DELETE FROM user_login_audit WHERE email_normalized LIKE ? OR email LIKE ?", PREFIX + "%", PREFIX + "%");
        jdbc.update("DELETE FROM user_companies WHERE company_id IN (SELECT id FROM companies WHERE name LIKE ?)", PREFIX + "%");
        jdbc.update("DELETE FROM users WHERE email LIKE ?", PREFIX + "%");
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", PREFIX + "%");
    }

    @Test
    void localRootCanLogInAndUsePlatformAdministrationWithoutClaimingOtpVerification() throws Exception {
        var account = rootAccount();
        var csrf = csrf();
        var oldSessionId = csrf.session().getId();
        assertThat(auth.requiresStrongMfa(account.userId())).isTrue();

        mockMvc.perform(post("/api/v1/auth/login")
                .session(csrf.session())
                .header("X-CSRF-Token", csrf.token())
                .contentType(APPLICATION_JSON)
                .content(loginPayload(account, PASSWORD)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.id").value(account.userId()))
            .andExpect(jsonPath("$.mfaRequired").doesNotExist());

        assertThat(csrf.session().getId()).isNotEqualTo(oldSessionId);
        assertThat(csrf.session().getAttribute(SessionAuthService.SESSION_MFA_VERIFIED)).isEqualTo(false);
        mockMvc.perform(get("/api/v1/platform-admin/context").session(csrf.session()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("PLATFORM_ROOT"));
        assertThat(auth.isMfaVerified(csrf.session())).isFalse();
        verifyNoInteractions(otpEmail);
    }

    @Test
    void localExceptionStillRejectsAnIncorrectPassword() throws Exception {
        var account = rootAccount();
        var csrf = csrf();

        mockMvc.perform(post("/api/v1/auth/login")
                .session(csrf.session())
                .header("X-CSRF-Token", csrf.token())
                .contentType(APPLICATION_JSON)
                .content(loginPayload(account, "incorrect-password")))
            .andExpect(status().isUnauthorized());

        assertThat(csrf.session().getAttribute(SessionAuthService.SESSION_USER_ID)).isNull();
        mockMvc.perform(get("/api/v1/platform-admin/context").session(csrf.session()))
            .andExpect(status().isUnauthorized());
        verifyNoInteractions(otpEmail);
    }

    private Account rootAccount() {
        var discriminator = UUID.randomUUID().toString();
        var company = PREFIX + discriminator;
        var email = company + "@example.com";
        jdbc.update("INSERT INTO companies (name) VALUES (?)", company);
        var companyId = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, company);
        jdbc.update("INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, 'Local Auth Test')", email, passwordEncoder.encode(PASSWORD));
        var userId = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
        jdbc.update("INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, 'admin', 'active', 'all')", userId, companyId);
        jdbc.update("INSERT INTO platform_administrators (user_id, platform_role, status, mfa_required, created_by_user_id) VALUES (?, 'PLATFORM_ROOT', 'ACTIVE', 0, ?)", userId, userId);
        return new Account(userId, company, email);
    }

    private Csrf csrf() throws Exception {
        var result = mockMvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        return new Csrf(
            (MockHttpSession) result.getRequest().getSession(false),
            objectMapper.readTree(result.getResponse().getContentAsString()).get("csrfToken").asText()
        );
    }

    private String loginPayload(Account account, String password) {
        return """
            {"companyName":"%s","email":"%s","password":"%s"}
            """.formatted(account.company(), account.email(), password);
    }

    private record Account(long userId, String company, String email) {
    }

    private record Csrf(MockHttpSession session, String token) {
    }
}
