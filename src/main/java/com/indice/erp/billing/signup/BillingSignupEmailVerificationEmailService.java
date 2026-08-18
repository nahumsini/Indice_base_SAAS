package com.indice.erp.billing.signup;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Service
public class BillingSignupEmailVerificationEmailService {

    private static final String SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";
    private static final String SUBJECT = "Verify your Indice email address";

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final RestClient restClient;
    private final boolean enabled;
    private final String provider;
    private final String fromAddress;
    private final String fromName;
    private final String replyToAddress;
    private final String sendgridApiKey;

    public BillingSignupEmailVerificationEmailService(
        ObjectProvider<JavaMailSender> mailSenderProvider,
        RestClient.Builder restClientBuilder,
        @Value("${app.email.enabled:true}") boolean enabled,
        @Value("${app.email.provider:sendgrid}") String provider,
        @Value("${app.email.from:no-reply@indice.local}") String fromAddress,
        @Value("${app.email.from-name:Indice ERP}") String fromName,
        @Value("${app.email.reply-to:}") String replyToAddress,
        @Value("${app.email.sendgrid.api-key:}") String sendgridApiKey
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.restClient = restClientBuilder.build();
        this.enabled = enabled;
        this.provider = clean(provider, "smtp").toLowerCase();
        this.fromAddress = clean(fromAddress, "");
        this.fromName = clean(fromName, "");
        this.replyToAddress = clean(replyToAddress, "");
        this.sendgridApiKey = clean(sendgridApiKey, "");
    }

    public DeliveryResult sendVerification(String email, String fullName, String companyName, String otpCode, int ttlSeconds) {
        if (!enabled) {
            return DeliveryResult.failed("Email delivery is disabled.");
        }
        if ("sendgrid".equals(provider)) {
            return sendWithSendGrid(email, fullName, companyName, otpCode, ttlSeconds);
        }
        if (!provider.isBlank() && !"smtp".equals(provider)) {
            return DeliveryResult.failed("Unsupported email provider.");
        }
        return sendWithSmtp(email, fullName, companyName, otpCode, ttlSeconds);
    }

    private DeliveryResult sendWithSmtp(String email, String fullName, String companyName, String otpCode, int ttlSeconds) {
        var mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            return DeliveryResult.failed("Mail sender is not configured.");
        }
        try {
            var message = new SimpleMailMessage();
            if (!fromAddress.isBlank()) {
                message.setFrom(fromAddress);
            }
            if (!replyToAddress.isBlank()) {
                message.setReplyTo(replyToAddress);
            }
            message.setTo(email);
            message.setSubject(SUBJECT);
            message.setText(body(fullName, companyName, otpCode, ttlSeconds));
            mailSender.send(message);
            return DeliveryResult.sentResult();
        } catch (MailException exception) {
            return DeliveryResult.failed("Unable to send verification code.");
        }
    }

    private DeliveryResult sendWithSendGrid(String email, String fullName, String companyName, String otpCode, int ttlSeconds) {
        if (sendgridApiKey.isBlank() || fromAddress.isBlank()) {
            return DeliveryResult.failed("SendGrid API key or from address is not configured.");
        }
        try {
            restClient.post()
                .uri(SENDGRID_URL)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + sendgridApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(sendGridPayload(email, fullName, companyName, otpCode, ttlSeconds))
                .retrieve()
                .toBodilessEntity();
            return DeliveryResult.sentResult();
        } catch (RestClientResponseException exception) {
            return DeliveryResult.failed("SendGrid returned HTTP " + exception.getStatusCode().value() + ".");
        } catch (RestClientException exception) {
            return DeliveryResult.failed("Unable to send verification code.");
        }
    }

    private Map<String, Object> sendGridPayload(String email, String fullName, String companyName, String otpCode, int ttlSeconds) {
        var from = new LinkedHashMap<String, Object>();
        from.put("email", fromAddress);
        if (!fromName.isBlank()) {
            from.put("name", fromName);
        }
        var recipient = Map.<String, Object>of("email", email);
        var personalization = Map.<String, Object>of("to", java.util.List.of(recipient), "subject", SUBJECT);
        var payload = new LinkedHashMap<String, Object>();
        payload.put("personalizations", java.util.List.of(personalization));
        payload.put("from", from);
        if (!replyToAddress.isBlank()) {
            payload.put("reply_to", Map.of("email", replyToAddress));
        }
        payload.put("content", java.util.List.of(Map.of(
            "type", "text/plain",
            "value", body(fullName, companyName, otpCode, ttlSeconds)
        )));
        return payload;
    }

    private String body(String fullName, String companyName, String otpCode, int ttlSeconds) {
        var minutes = Math.max(1, ttlSeconds / 60);
        return """
            Hi %s,

            Use this verification code to confirm your email before creating the %s workspace:

            %s

            This code expires in %d minutes. Indice will not start payment or create the workspace until this email is verified.

            If you did not start this signup, you can ignore this email.

            The Indice Team
            """.formatted(firstName(fullName), clean(companyName, "Indice"), otpCode, minutes);
    }

    private String firstName(String fullName) {
        var cleaned = clean(fullName, "there");
        var space = cleaned.indexOf(' ');
        return space > 0 ? cleaned.substring(0, space) : cleaned;
    }

    private String clean(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    public record DeliveryResult(boolean sent, String status, String message) {
        static DeliveryResult sentResult() {
            return new DeliveryResult(true, "sent", "");
        }

        static DeliveryResult failed(String message) {
            return new DeliveryResult(false, "failed", message);
        }
    }
}
