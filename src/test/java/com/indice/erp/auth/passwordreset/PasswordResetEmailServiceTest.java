package com.indice.erp.auth.passwordreset;

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
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import java.io.IOException;
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

class PasswordResetEmailServiceTest {

    private static final String SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";

    @Test
    void sendPasswordResetPostsExpectedSendGridPayload() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, true, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "support@indice.test", "sg-secret", emptyMailSenderProvider());

        server.expect(requestTo(SENDGRID_URL))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer sg-secret"))
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.personalizations[0].to[0].email").value("ada@example.com"))
            .andExpect(jsonPath("$.personalizations[0].subject").value("Reset your Indice password"))
            .andExpect(jsonPath("$.from.email").value("no-reply@indice.test"))
            .andExpect(jsonPath("$.from.name").value("Indice ERP"))
            .andExpect(jsonPath("$.reply_to.email").value("support@indice.test"))
            .andExpect(jsonPath("$.content[0].type").value("text/plain"))
            .andExpect(jsonPath("$.content[0].value", containsString("Hi Ada Owner,")))
            .andExpect(jsonPath("$.content[0].value", containsString("https://app.indice.test/reset-password/token")))
            .andRespond(withAccepted());

        var result = service.sendPasswordReset(
            "ada@example.com",
            "Ada Owner",
            "https://app.indice.test/reset-password/token"
        );

        assertTrue(result.sent());
        assertEquals("sent", result.status());
        server.verify();
    }

    @Test
    void sendPasswordResetRequiresFromAddressBeforeHttpRequest() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, true, "sendgrid", "", "Indice ERP",
            "", "sg-secret", emptyMailSenderProvider());

        var result = service.sendPasswordReset(
            "ada@example.com",
            "Ada Owner",
            "https://app.indice.test/reset-password/token"
        );

        assertFalse(result.sent());
        assertEquals("failed", result.status());
        assertEquals("Email from address is not configured.", result.message());
        server.verify();
    }

    @Test
    void sendPasswordResetReportsSendGridHttpStatusFailures() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, true, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "", "sg-secret", emptyMailSenderProvider());

        server.expect(requestTo(SENDGRID_URL))
            .andExpect(method(HttpMethod.POST))
            .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

        var result = service.sendPasswordReset(
            "ada@example.com",
            "Ada Owner",
            "https://app.indice.test/reset-password/token"
        );

        assertFalse(result.sent());
        assertEquals("failed", result.status());
        assertEquals("Unable to send password reset email: SendGrid returned HTTP 429.", result.message());
        server.verify();
    }

    @Test
    void sendPasswordResetReportsSendGridTransportFailures() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, true, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "", "sg-secret", emptyMailSenderProvider());

        server.expect(requestTo(SENDGRID_URL))
            .andExpect(method(HttpMethod.POST))
            .andRespond(withException(new IOException("connection reset")));

        var result = service.sendPasswordReset(
            "ada@example.com",
            "Ada Owner",
            "https://app.indice.test/reset-password/token"
        );

        assertFalse(result.sent());
        assertEquals("failed", result.status());
        assertEquals("Unable to send password reset email: I/O error on POST request for \"https://api.sendgrid.com/v3/mail/send\": connection reset", result.message());
        server.verify();
    }

    @Test
    void sendPasswordResetReturnsDisabledWhenEmailDeliveryIsDisabled() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, false, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "", "sg-secret", emptyMailSenderProvider());

        var result = service.sendPasswordReset(
            "ada@example.com",
            "Ada Owner",
            "https://app.indice.test/reset-password/token"
        );

        assertFalse(result.sent());
        assertEquals("disabled", result.status());
        server.verify();
    }

    @Test
    void sendPasswordResetRejectsUnsupportedProviderWithoutSmtpFallback() {
        var service = service(RestClient.builder(), true, "mailgun", "no-reply@indice.test", "Indice ERP",
            "", "", emptyMailSenderProvider());

        var result = service.sendPasswordReset(
            "ada@example.com",
            "Ada Owner",
            "https://app.indice.test/reset-password/token"
        );

        assertFalse(result.sent());
        assertEquals("failed", result.status());
        assertEquals("Unsupported email provider: mailgun.", result.message());
    }

    @Test
    void smtpProviderSendsPlainTextPasswordReset() {
        var mailSender = mock(JavaMailSender.class);
        var service = service(RestClient.builder(), true, "smtp", "no-reply@indice.test", "Indice ERP",
            "support@indice.test", "", mailSenderProvider(mailSender));

        var result = service.sendPasswordReset(
            "ada@example.com",
            "Ada Owner",
            "https://app.indice.test/reset-password/token"
        );

        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(message.capture());
        assertTrue(result.sent());
        assertEquals("sent", result.status());
        assertEquals("no-reply@indice.test", message.getValue().getFrom());
        assertEquals("support@indice.test", message.getValue().getReplyTo());
        assertArrayEquals(new String[] { "ada@example.com" }, message.getValue().getTo());
        assertEquals("Reset your Indice password", message.getValue().getSubject());
        assertTrue(message.getValue().getText().contains("Hi Ada Owner,"));
        assertTrue(message.getValue().getText().contains("https://app.indice.test/reset-password/token"));
    }

    private PasswordResetEmailService service(
        RestClient.Builder builder,
        boolean enabled,
        String provider,
        String fromAddress,
        String fromName,
        String replyToAddress,
        String sendgridApiKey,
        ObjectProvider<JavaMailSender> mailSenderProvider
    ) {
        return new PasswordResetEmailService(
            mailSenderProvider,
            builder,
            enabled,
            provider,
            fromAddress,
            fromName,
            replyToAddress,
            sendgridApiKey
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
