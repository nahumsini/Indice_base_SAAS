package com.indice.erp.auth;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
class SignupWelcomeEmailService {

    private static final Logger log = LoggerFactory.getLogger(SignupWelcomeEmailService.class);
    private static final String SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";
    private static final String SUBJECT = "Welcome to Indice";

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final RestClient restClient;
    private final boolean enabled;
    private final String provider;
    private final String fromAddress;
    private final String fromName;
    private final String replyToAddress;
    private final String sendgridApiKey;
    private final String loginUrl;

    SignupWelcomeEmailService(
        ObjectProvider<JavaMailSender> mailSenderProvider,
        RestClient.Builder restClientBuilder,
        @Value("${app.email.enabled:true}") boolean enabled,
        @Value("${app.email.provider:sendgrid}") String provider,
        @Value("${app.email.from:no-reply@indice.local}") String fromAddress,
        @Value("${app.email.from-name:Indice ERP}") String fromName,
        @Value("${app.email.reply-to:}") String replyToAddress,
        @Value("${app.email.sendgrid.api-key:}") String sendgridApiKey,
        @Value("${app.frontend.login-url:http://localhost:5174/login}") String loginUrl
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.restClient = restClientBuilder.build();
        this.enabled = enabled;
        this.provider = clean(provider, "smtp").toLowerCase();
        this.fromAddress = clean(fromAddress, "");
        this.fromName = clean(fromName, "");
        this.replyToAddress = clean(replyToAddress, "");
        this.sendgridApiKey = clean(sendgridApiKey, "");
        this.loginUrl = clean(loginUrl, "http://localhost:5174/login");
    }

    void sendWelcome(SignupProfile profile, SignupBillingInfo billing) {
        if (!enabled) {
            log.info("Signup welcome email disabled for {}", profile.email());
            return;
        }
        try {
            if ("sendgrid".equals(provider)) {
                sendWithSendGrid(profile, billing);
            } else {
                sendWithSmtp(profile, billing);
            }
            log.info("Signup welcome email sent to {}", profile.email());
        } catch (RuntimeException ex) {
            log.warn("Unable to send signup welcome email to {}", profile.email(), ex);
        }
    }

    private void sendWithSmtp(SignupProfile profile, SignupBillingInfo billing) {
        var mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            throw new IllegalStateException("Mail sender is not configured.");
        }
        var message = new SimpleMailMessage();
        if (!fromAddress.isBlank()) {
            message.setFrom(fromAddress);
        }
        if (!replyToAddress.isBlank()) {
            message.setReplyTo(replyToAddress);
        }
        message.setTo(profile.email());
        message.setSubject(SUBJECT);
        message.setText(body(profile, billing));
        mailSender.send(message);
    }

    private void sendWithSendGrid(SignupProfile profile, SignupBillingInfo billing) {
        if (sendgridApiKey.isBlank() || fromAddress.isBlank()) {
            throw new IllegalStateException("SendGrid API key or from address is not configured.");
        }
        restClient.post()
            .uri(SENDGRID_URL)
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + sendgridApiKey)
            .contentType(MediaType.APPLICATION_JSON)
            .body(sendGridPayload(profile, billing))
            .retrieve()
            .toBodilessEntity();
    }

    private Map<String, Object> sendGridPayload(SignupProfile profile, SignupBillingInfo billing) {
        var from = new LinkedHashMap<String, Object>();
        from.put("email", fromAddress);
        if (!fromName.isBlank()) {
            from.put("name", fromName);
        }
        var recipient = Map.<String, Object>of("email", profile.email());
        var personalization = Map.<String, Object>of("to", java.util.List.of(recipient), "subject", SUBJECT);
        var payload = new LinkedHashMap<String, Object>();
        payload.put("personalizations", java.util.List.of(personalization));
        payload.put("from", from);
        if (!replyToAddress.isBlank()) {
            payload.put("reply_to", Map.of("email", replyToAddress));
        }
        payload.put("content", java.util.List.of(Map.of("type", "text/plain", "value", body(profile, billing))));
        return payload;
    }

    private String body(SignupProfile profile, SignupBillingInfo billing) {
        return """
            Hi %s,

            Your Indice account for %s is ready.

            Your 30-day free trial includes all Basic modules. After the trial, your selected paid plan continues if payment succeeds.

            Selected plan: %s
            Trial ends: %s
            Sign in: %s
            """.formatted(profile.fullName(), profile.companyName(), billing.plan().planId(), date(billing.trialEnd()), loginUrl);
    }

    private String date(Instant value) {
        return value == null ? "" : DateTimeFormatter.ISO_LOCAL_DATE.format(value.atOffset(ZoneOffset.UTC));
    }

    private String clean(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
