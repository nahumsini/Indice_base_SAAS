package com.indice.erp.billing.collection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withAccepted;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class PaymentRequestReminderEmailServiceTest {
    @Test
    void sendsCurrentOwnerAStableReferenceAndTheExactDeadlineWithoutAPaymentToken() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var sender = service(builder, true, "https://app.indice.test");
        server.expect(requestTo("https://api.sendgrid.com/v3/mail/send"))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-only-sendgrid-key"))
            .andExpect(jsonPath("$.personalizations[0].to[0].email").value("current-owner@example.test"))
            .andExpect(jsonPath("$.personalizations[0].custom_args.indice_delivery").value("payment-request.9.2.0"))
            .andExpect(jsonPath("$.content[0].value", containsString("2026-09-15T12:00:00Z")))
            .andExpect(jsonPath("$.content[0].value", containsString("https://app.indice.test/billing")))
            .andRespond(withAccepted().header("X-Message-Id", "provider-message-1"));

        var result = sender.send(dispatch());

        assertThat(sender.isConfigured()).isTrue();
        assertThat(result.sent()).isTrue();
        assertThat(result.providerReference()).isEqualTo("provider-message-1");
        server.verify();
    }

    @Test
    void providerFailureIsExplicitAndDoesNotExposeItsResponseBody() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.sendgrid.com/v3/mail/send"))
            .andRespond(withStatus(HttpStatus.FORBIDDEN).body("provider-private-response-test-only"));

        var result = service(builder, true, "https://app.indice.test").send(dispatch());

        assertThat(result.sent()).isFalse();
        assertThat(result.errorCode()).isEqualTo("EMAIL_PROVIDER_HTTP_403");
        assertThat(result.toString()).doesNotContain("provider-private", "test-only-sendgrid-key", "current-owner");
        server.verify();
    }

    @Test
    void disabledEmailMakesNoProviderRequest() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var result = service(builder, false, "https://app.indice.test").send(dispatch());
        assertThat(result.sent()).isFalse();
        assertThat(result.errorCode()).isEqualTo("EMAIL_DISABLED");
        assertThat(service(builder, false, "https://app.indice.test").isConfigured()).isFalse();
        server.verify();
    }

    @Test
    void missingOrUnsafePublicUrlCannotSendAnUnusablePaymentReminder() {
        for (var url : new String[] {"", "http://app.indice.test", "https://user:password@app.indice.test"}) {
            var builder = RestClient.builder();
            var server = MockRestServiceServer.bindTo(builder).build();
            assertThat(service(builder, true, url).send(dispatch()).errorCode()).isEqualTo("PUBLIC_URL_NOT_CONFIGURED");
            server.verify();
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    void productionConstructorRequiresBothGlobalAndCollectionEmailEnabling() {
        var provider = (ObjectProvider<JavaMailSender>) mock(ObjectProvider.class);
        var service = new PaymentRequestReminderEmailService(provider, true, false, "smtp", "billing@example.test",
            "Indice", "", "", "https://app.indice.test");
        assertThat(service.send(dispatch()).errorCode()).isEqualTo("EMAIL_DISABLED");
        verifyNoInteractions(provider);
    }

    @SuppressWarnings("unchecked")
    private PaymentRequestReminderEmailService service(RestClient.Builder builder, boolean enabled, String publicUrl) {
        return new PaymentRequestReminderEmailService((ObjectProvider<JavaMailSender>) mock(ObjectProvider.class),
            builder.build(), enabled, "sendgrid", "billing@example.test", "Indice", "support@example.test",
            "test-only-sendgrid-key", publicUrl);
    }

    private PaymentRequestReminderRepository.Dispatch dispatch() {
        return new PaymentRequestReminderRepository.Dispatch(
            new PaymentRequestReminderRepository.Claim(new PaymentRequestReminderRepository.Candidate(1, 7, 9),
                2, 0, "EMAIL", "test-lease", 1), "test-reference",
            new PaymentRequestReminderRepository.Owner(3, 4, "current-owner@example.test", "Owner", "Test Company"),
            Instant.parse("2026-09-15T12:00:00Z"), 9900, "USD");
    }
}
