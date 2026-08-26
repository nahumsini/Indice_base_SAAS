package com.indice.erp.auth;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
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
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class SignupWelcomeEmailServiceTest {

    private static final String SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";

    @Test
    void sendWelcomePostsExpectedSendGridPayload() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, true, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "support@indice.test", "sg-secret", "https://app.indice.test/login", emptyMailSenderProvider());

        server.expect(requestTo(SENDGRID_URL))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer sg-secret"))
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.personalizations[0].to[0].email").value("ada@example.com"))
            .andExpect(jsonPath("$.personalizations[0].subject").value("Welcome to Índice - your workspace is ready"))
            .andExpect(jsonPath("$.from.email").value("no-reply@indice.test"))
            .andExpect(jsonPath("$.from.name").value("Indice ERP"))
            .andExpect(jsonPath("$.reply_to.email").value("support@indice.test"))
            .andExpect(jsonPath("$.content[0].type").value("text/plain"))
            .andExpect(jsonPath("$.content[0].value", containsString("Hi Ada,")))
            .andExpect(jsonPath("$.content[0].value", containsString("Welcome to Índice.")))
            .andExpect(jsonPath("$.content[0].value", containsString("Ada Studio")))
            .andExpect(jsonPath("$.content[0].value", containsString("Workspace / Company: Ada Studio")))
            .andExpect(jsonPath("$.content[0].value", containsString("Email: ada@example.com")))
            .andExpect(jsonPath("$.content[0].value", containsString("Password: The password you created during signup")))
            .andExpect(jsonPath("$.content[0].value", containsString("Sign in here:\nhttps://app.indice.test/login")))
            .andExpect(jsonPath("$.content[0].value", containsString("Your account includes a 30-day trial.")))
            .andExpect(jsonPath("$.content[0].value", containsString("contact us at support@indice.test")))
            .andExpect(jsonPath("$.content[1].type").value("text/html"))
            .andExpect(jsonPath("$.content[1].value", containsString("Welcome to Indice")))
            .andExpect(jsonPath("$.content[1].value", containsString("Open your workspace")))
            .andExpect(jsonPath("$.content[1].value", containsString("Workspace ready")))
            .andExpect(jsonPath("$.content[1].value", containsString("The password created during signup")))
            .andExpect(jsonPath("$.content[1].value", containsString("30-day trial active")))
            .andRespond(withAccepted());

        service.sendWelcome(profile(), billing());

        server.verify();
    }

    @Test
    void sendWelcomeSwallowsSendGridHttpFailures() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, true, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "", "sg-secret", "https://app.indice.test/login", emptyMailSenderProvider());

        server.expect(requestTo(SENDGRID_URL))
            .andExpect(method(HttpMethod.POST))
            .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertDoesNotThrow(() -> service.sendWelcome(profile(), billing()));
        server.verify();
    }

    @Test
    void sendWelcomeDoesNothingWhenEmailDeliveryIsDisabled() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, false, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "", "sg-secret", "https://app.indice.test/login", emptyMailSenderProvider());

        service.sendWelcome(profile(), billing());

        server.verify();
    }

    @Test
    void sendWelcomeSwallowsMissingSendGridConfiguration() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, true, "sendgrid", "", "Indice ERP",
            "", "", "https://app.indice.test/login", emptyMailSenderProvider());

        assertDoesNotThrow(() -> service.sendWelcome(profile(), billing()));
        server.verify();
    }

    @Test
    void smtpProviderSendsPlainTextWelcome() {
        var mailSender = mock(JavaMailSender.class);
        var service = service(RestClient.builder(), true, "smtp", "no-reply@indice.test", "Indice ERP",
            "support@indice.test", "", "https://app.indice.test/login", mailSenderProvider(mailSender));

        service.sendWelcome(profile(), billing());

        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(message.capture());
        assertEquals("no-reply@indice.test", message.getValue().getFrom());
        assertEquals("support@indice.test", message.getValue().getReplyTo());
        assertArrayEquals(new String[] { "ada@example.com" }, message.getValue().getTo());
        assertEquals("Welcome to Índice - your workspace is ready", message.getValue().getSubject());
        assertTrue(message.getValue().getText().contains("Hi Ada,"));
        assertTrue(message.getValue().getText().contains("Welcome to Índice."));
        assertTrue(message.getValue().getText().contains("Ada Studio"));
        assertTrue(message.getValue().getText().contains("Workspace / Company: Ada Studio"));
        assertTrue(message.getValue().getText().contains("Email: ada@example.com"));
        assertTrue(message.getValue().getText().contains("Password: The password you created during signup"));
        assertTrue(message.getValue().getText().contains("Sign in here:\nhttps://app.indice.test/login"));
        assertTrue(message.getValue().getText().contains("Your account includes a 30-day trial."));
        assertTrue(message.getValue().getText().contains("contact us at support@indice.test"));
    }

    private SignupWelcomeEmailService service(
        RestClient.Builder builder,
        boolean enabled,
        String provider,
        String fromAddress,
        String fromName,
        String replyToAddress,
        String sendgridApiKey,
        String loginUrl,
        ObjectProvider<JavaMailSender> mailSenderProvider
    ) {
        return new SignupWelcomeEmailService(
            mailSenderProvider,
            builder,
            enabled,
            provider,
            fromAddress,
            fromName,
            replyToAddress,
            sendgridApiKey,
            loginUrl
        );
    }

    private SignupProfile profile() {
        return new SignupProfile(
            "Ada Owner",
            "ada@example.com",
            "hash",
            "Ada Studio",
            "retail",
            "1-5",
            "US",
            "+15555550123"
        );
    }

    private SignupBillingInfo billing() {
        var trialStart = Instant.parse("2026-08-01T00:00:00Z");
        var trialEnd = Instant.parse("2026-08-31T00:00:00Z");
        return new SignupBillingInfo(
            new SignupPlanSelection("basic", 3, 10, 0, 19_95, "usd", List.of("human_resources")),
            "cus_test",
            "sub_test",
            "trialing",
            trialStart,
            trialEnd,
            trialStart,
            trialEnd,
            false,
            null,
            "stripe"
        );
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
