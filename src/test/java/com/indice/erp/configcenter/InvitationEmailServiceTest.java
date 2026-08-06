package com.indice.erp.configcenter;

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

class InvitationEmailServiceTest {

    private static final String SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";

    @Test
    void sendInvitationPostsExpectedSendGridPayload() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, true, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "support@indice.test", "sg-secret", emptyMailSenderProvider());

        server.expect(requestTo(SENDGRID_URL))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer sg-secret"))
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.personalizations[0].to[0].email").value("ada@example.com"))
            .andExpect(jsonPath("$.personalizations[0].subject").value("You have been invited to Indice"))
            .andExpect(jsonPath("$.from.email").value("no-reply@indice.test"))
            .andExpect(jsonPath("$.from.name").value("Indice ERP"))
            .andExpect(jsonPath("$.reply_to.email").value("support@indice.test"))
            .andExpect(jsonPath("$.content[0].type").value("text/plain"))
            .andExpect(jsonPath("$.content[0].value", containsString("Hi Ada Owner,")))
            .andExpect(jsonPath("$.content[0].value", containsString("https://app.indice.test/invite/token")))
            .andRespond(withAccepted());

        var result = service.sendInvitation("ada@example.com", "Ada Owner", "https://app.indice.test/invite/token");

        assertTrue(result.sent());
        assertEquals("sent", result.status());
        server.verify();
    }

    @Test
    void sendInvitationRequiresSendGridApiKeyBeforeHttpRequest() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, true, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "", "", emptyMailSenderProvider());

        var result = service.sendInvitation("ada@example.com", "Ada Owner", "https://app.indice.test/invite/token");

        assertFalse(result.sent());
        assertEquals("failed", result.status());
        assertEquals("SendGrid API key is not configured.", result.message());
        server.verify();
    }

    @Test
    void sendInvitationReportsSendGridHttpStatusFailures() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, true, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "", "sg-secret", emptyMailSenderProvider());

        server.expect(requestTo(SENDGRID_URL))
            .andExpect(method(HttpMethod.POST))
            .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        var result = service.sendInvitation("ada@example.com", "Ada Owner", "https://app.indice.test/invite/token");

        assertFalse(result.sent());
        assertEquals("failed", result.status());
        assertEquals("Unable to send invitation email: SendGrid returned HTTP 401.", result.message());
        server.verify();
    }

    @Test
    void sendInvitationReportsSendGridTransportFailures() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, true, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "", "sg-secret", emptyMailSenderProvider());

        server.expect(requestTo(SENDGRID_URL))
            .andExpect(method(HttpMethod.POST))
            .andRespond(withException(new IOException("connection reset")));

        var result = service.sendInvitation("ada@example.com", "Ada Owner", "https://app.indice.test/invite/token");

        assertFalse(result.sent());
        assertEquals("failed", result.status());
        assertEquals("Unable to send invitation email: I/O error on POST request for \"https://api.sendgrid.com/v3/mail/send\": connection reset", result.message());
        server.verify();
    }

    @Test
    void sendInvitationReturnsDisabledWhenEmailDeliveryIsDisabled() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, false, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "", "sg-secret", emptyMailSenderProvider());

        var result = service.sendInvitation("ada@example.com", "Ada Owner", "https://app.indice.test/invite/token");

        assertFalse(result.sent());
        assertEquals("disabled", result.status());
        server.verify();
    }

    @Test
    void sendInvitationRejectsUnsupportedProviderWithoutSmtpFallback() {
        var service = service(RestClient.builder(), true, "mailgun", "no-reply@indice.test", "Indice ERP",
            "", "", emptyMailSenderProvider());

        var result = service.sendInvitation("ada@example.com", "Ada Owner", "https://app.indice.test/invite/token");

        assertFalse(result.sent());
        assertEquals("failed", result.status());
        assertEquals("Unsupported email provider: mailgun.", result.message());
    }

    @Test
    void smtpProviderSendsPlainTextInvitation() {
        var mailSender = mock(JavaMailSender.class);
        var service = service(RestClient.builder(), true, "smtp", "no-reply@indice.test", "Indice ERP",
            "support@indice.test", "", mailSenderProvider(mailSender));

        var result = service.sendInvitation("ada@example.com", "Ada Owner", "https://app.indice.test/invite/token");

        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(message.capture());
        assertTrue(result.sent());
        assertEquals("sent", result.status());
        assertEquals("no-reply@indice.test", message.getValue().getFrom());
        assertEquals("support@indice.test", message.getValue().getReplyTo());
        assertArrayEquals(new String[] { "ada@example.com" }, message.getValue().getTo());
        assertEquals("You have been invited to Indice", message.getValue().getSubject());
        assertTrue(message.getValue().getText().contains("Hi Ada Owner,"));
        assertTrue(message.getValue().getText().contains("https://app.indice.test/invite/token"));
    }

    private InvitationEmailService service(
        RestClient.Builder builder,
        boolean enabled,
        String provider,
        String fromAddress,
        String fromName,
        String replyToAddress,
        String sendgridApiKey,
        ObjectProvider<JavaMailSender> mailSenderProvider
    ) {
        return new InvitationEmailService(
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
