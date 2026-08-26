package com.indice.erp.auth;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withAccepted;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class LoginOtpEmailServiceTest {

    private static final String SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";

    @Test
    void sendOtpPostsProfessionalTextAndHtmlPayload() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = service(builder, true, "sendgrid", "no-reply@indice.test", "Indice ERP",
            "security@indice.test", "sg-secret", emptyMailSenderProvider());

        server.expect(requestTo(SENDGRID_URL))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer sg-secret"))
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.personalizations[0].to[0].email").value("ada@example.com"))
            .andExpect(jsonPath("$.personalizations[0].subject").value("Your Índice verification code"))
            .andExpect(jsonPath("$.from.email").value("no-reply@indice.test"))
            .andExpect(jsonPath("$.from.name").value("Indice ERP"))
            .andExpect(jsonPath("$.reply_to.email").value("security@indice.test"))
            .andExpect(jsonPath("$.content[0].type").value("text/plain"))
            .andExpect(jsonPath("$.content[0].value", containsString("Your sign-in verification code for Ada Studio is:")))
            .andExpect(jsonPath("$.content[0].value", containsString("123456")))
            .andExpect(jsonPath("$.content[0].value", containsString("Never share this code with anyone.")))
            .andExpect(jsonPath("$.content[1].type").value("text/html"))
            .andExpect(jsonPath("$.content[1].value", containsString("Confirm your sign-in")))
            .andExpect(jsonPath("$.content[1].value", containsString("123 456")))
            .andExpect(jsonPath("$.content[1].value", containsString("Secure sign-in")))
            .andExpect(jsonPath("$.content[1].value", containsString("Do not share this code")))
            .andRespond(withAccepted());

        var result = service.sendOtp(login(), "123456", 300);

        assertTrue(result.sent());
        assertEquals("sent", result.status());
        server.verify();
    }

    private LoginOtpEmailService service(
        RestClient.Builder builder,
        boolean enabled,
        String provider,
        String fromAddress,
        String fromName,
        String replyToAddress,
        String sendgridApiKey,
        ObjectProvider<JavaMailSender> mailSenderProvider
    ) {
        return new LoginOtpEmailService(
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

    private AuthenticatedLogin login() {
        return new AuthenticatedLogin(1L, 2L, 3L, "Ada Owner", "ada@example.com", "Ada Studio", "admin");
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
