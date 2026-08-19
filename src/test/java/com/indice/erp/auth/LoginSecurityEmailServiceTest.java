package com.indice.erp.auth;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withAccepted;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class LoginSecurityEmailServiceTest {

    private static final String SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-08-18T22:15:00Z"), ZoneOffset.UTC);

    @Test
    void sendLoginSuccessPostsSendGridTextAndHtmlPayload() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, true, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "security@indice.test", "sg-secret", emptyMailSenderProvider());

        server.expect(requestTo(SENDGRID_URL))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer sg-secret"))
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.personalizations[0].to[0].email").value("ada@example.com"))
            .andExpect(jsonPath("$.personalizations[0].subject").value("Security alert: new sign-in to your Indice account"))
            .andExpect(jsonPath("$.from.email").value("no-reply@indice.test"))
            .andExpect(jsonPath("$.from.name").value("Indice ERP"))
            .andExpect(jsonPath("$.reply_to.email").value("security@indice.test"))
            .andExpect(jsonPath("$.content[0].type").value("text/plain"))
            .andExpect(jsonPath("$.content[0].value", containsString("Your Indice account was just used to sign in.")))
            .andExpect(jsonPath("$.content[0].value", containsString("IP address 203.0.113.9")))
            .andExpect(jsonPath("$.content[0].value", containsString("Mozilla/5.0 Test Browser")))
            .andExpect(jsonPath("$.content[1].type").value("text/html"))
            .andExpect(jsonPath("$.content[1].value", containsString("New sign-in to your Indice account")))
            .andRespond(withAccepted());

        var result = service.sendLoginSuccess(login(), context());

        assertTrue(result.sent());
        assertEquals("sent", result.status());
        server.verify();
    }

    @Test
    void sendPasswordFailureSkipsUnknownUserToAvoidEmailEnumeration() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, true, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "", "sg-secret", emptyMailSenderProvider());
        var verification = LoginCredentialVerificationResult.failure(
            "Invalid company, email, or password.",
            AuthFailureReason.USER_NOT_FOUND,
            "unknown@example.com",
            "demo",
            null,
            null,
            null,
            null
        );

        var result = service.sendPasswordFailure(verification, AuthLockoutService.LockoutState.open(), context());

        assertFalse(result.sent());
        assertEquals("skipped", result.status());
        server.verify();
    }

    @Test
    void sendPasswordFailureIncludesAttemptAndLockoutStatus() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, true, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "", "sg-secret", emptyMailSenderProvider());
        var lockout = new AuthLockoutService.LockoutState(5, Instant.parse("2026-08-18T22:45:00Z"), true);

        server.expect(requestTo(SENDGRID_URL))
            .andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.personalizations[0].to[0].email").value("ada@example.com"))
            .andExpect(jsonPath("$.personalizations[0].subject").value("Security alert: unsuccessful sign-in attempt"))
            .andExpect(jsonPath("$.content[0].value", containsString("Attempts used: 5 of 5")))
            .andExpect(jsonPath("$.content[0].value", containsString("Temporarily locked until 2026-08-18 22:45 UTC")))
            .andExpect(jsonPath("$.content[1].value", containsString("Unsuccessful sign-in attempt")))
            .andRespond(withAccepted());

        var result = service.sendPasswordFailure(passwordFailure(), lockout, context());

        assertTrue(result.sent());
        server.verify();
    }

    @Test
    void smtpProviderSendsPlainTextSecurityEmail() {
        var mailSender = mock(JavaMailSender.class);
        var service = service(RestClient.builder(), true, "smtp", "no-reply@indice.test", "Indice ERP",
            "security@indice.test", "", mailSenderProvider(mailSender));

        var result = service.sendLoginSuccess(login(), context());

        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(message.capture());
        assertTrue(result.sent());
        assertEquals("no-reply@indice.test", message.getValue().getFrom());
        assertEquals("security@indice.test", message.getValue().getReplyTo());
        assertArrayEquals(new String[] { "ada@example.com" }, message.getValue().getTo());
        assertEquals("Security alert: new sign-in to your Indice account", message.getValue().getSubject());
        assertTrue(message.getValue().getText().contains("Workspace: Ada Studio"));
        assertTrue(message.getValue().getText().contains("Location signal: IP address 203.0.113.9"));
    }

    private LoginSecurityEmailService service(
        RestClient.Builder builder,
        boolean enabled,
        String provider,
        String fromAddress,
        String fromName,
        String replyToAddress,
        String sendgridApiKey,
        ObjectProvider<JavaMailSender> mailSenderProvider
    ) {
        var properties = new AuthSecurityProperties();
        properties.setLoginLockoutAttempts(5);
        return new LoginSecurityEmailService(
            mailSenderProvider,
            builder,
            CLOCK,
            properties,
            enabled,
            provider,
            fromAddress,
            fromName,
            replyToAddress,
            sendgridApiKey
        );
    }

    private AuthenticatedLogin login() {
        return new AuthenticatedLogin(1L, 2L, 3L, "Ada Owner", "ada@example.com", "Ada Studio", "admin");
    }

    private LoginCredentialVerificationResult passwordFailure() {
        return LoginCredentialVerificationResult.failure(
            "Invalid company, email, or password.",
            AuthFailureReason.PASSWORD_INVALID,
            "ada@example.com",
            "ada studio",
            1L,
            null,
            null,
            null
        );
    }

    private LoginAuditContext context() {
        return new LoginAuditContext("203.0.113.9", "Mozilla/5.0 Test Browser", "session-1");
    }

    private ObjectProvider<JavaMailSender> emptyMailSenderProvider() {
        return mailSenderProvider(null);
    }

    @SuppressWarnings("unchecked")
    private ObjectProvider<JavaMailSender> mailSenderProvider(JavaMailSender mailSender) {
        var provider = (ObjectProvider<JavaMailSender>) mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(mailSender);
        return provider;
    }
}
