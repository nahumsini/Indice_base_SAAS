package com.indice.erp.auth;

import java.time.Instant;
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
public class SignupWelcomeEmailService {

    private static final Logger log = LoggerFactory.getLogger(SignupWelcomeEmailService.class);
    private static final String SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";
    private static final String SUBJECT = "Welcome to Índice - your workspace is ready";
    private static final String DEFAULT_SUPPORT_EMAIL = "support@indiceapp.com";

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
        sendWorkspaceWelcome(new WorkspaceWelcomeEmail(
            profile.fullName(),
            profile.email(),
            profile.companyName(),
            billing.trialEnd()
        ));
    }

    public void sendWorkspaceWelcome(WorkspaceWelcomeEmail welcome) {
        if (!enabled) {
            log.info("Signup welcome email disabled for {}", welcome.email());
            return;
        }
        try {
            if ("sendgrid".equals(provider)) {
                sendWithSendGrid(welcome);
            } else {
                sendWithSmtp(welcome);
            }
            log.info("Signup welcome email sent to {}", welcome.email());
        } catch (RuntimeException ex) {
            log.warn("Unable to send signup welcome email to {}", welcome.email(), ex);
        }
    }

    private void sendWithSmtp(WorkspaceWelcomeEmail welcome) {
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
        message.setTo(welcome.email());
        message.setSubject(SUBJECT);
        message.setText(body(welcome));
        mailSender.send(message);
    }

    private void sendWithSendGrid(WorkspaceWelcomeEmail welcome) {
        if (sendgridApiKey.isBlank() || fromAddress.isBlank()) {
            throw new IllegalStateException("SendGrid API key or from address is not configured.");
        }
        restClient.post()
            .uri(SENDGRID_URL)
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + sendgridApiKey)
            .contentType(MediaType.APPLICATION_JSON)
            .body(sendGridPayload(welcome))
            .retrieve()
            .toBodilessEntity();
    }

    private Map<String, Object> sendGridPayload(WorkspaceWelcomeEmail welcome) {
        var from = new LinkedHashMap<String, Object>();
        from.put("email", fromAddress);
        if (!fromName.isBlank()) {
            from.put("name", fromName);
        }
        var recipient = Map.<String, Object>of("email", welcome.email());
        var personalization = Map.<String, Object>of("to", java.util.List.of(recipient), "subject", SUBJECT);
        var payload = new LinkedHashMap<String, Object>();
        payload.put("personalizations", java.util.List.of(personalization));
        payload.put("from", from);
        if (!replyToAddress.isBlank()) {
            payload.put("reply_to", Map.of("email", replyToAddress));
        }
        payload.put("content", java.util.List.of(Map.of("type", "text/plain", "value", body(welcome))));
        return payload;
    }

    private String body(WorkspaceWelcomeEmail welcome) {
        var trialCopy = welcome.trialEnd() == null
            ? ""
            : """

                Your account includes a 30-day trial. During the trial, you can configure your team, review your modules, and prepare your workspace before billing begins.
                """;
        return """
            Hi %s,

            Welcome to Índice.

            Your workspace, %s, has been created successfully. You can now sign in and start using your selected modules.

            To log in, use:

            Workspace / Company: %s
            Email: %s
            Password: The password you created during signup

            Sign in here:
            %s%s

            If you need help getting started, contact us at %s.

            Welcome aboard,

            The Índice Team
            """.formatted(
                firstName(welcome.fullName()),
                welcome.companyName(),
                welcome.companyName(),
                welcome.email(),
                loginUrl,
                trialCopy,
                supportEmail()
            );
    }

    private String firstName(String fullName) {
        var cleaned = clean(fullName, "there");
        var space = cleaned.indexOf(' ');
        return space > 0 ? cleaned.substring(0, space) : cleaned;
    }

    private String supportEmail() {
        return replyToAddress.isBlank() ? DEFAULT_SUPPORT_EMAIL : replyToAddress;
    }

    private String clean(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    public record WorkspaceWelcomeEmail(
        String fullName,
        String email,
        String companyName,
        Instant trialEnd
    ) {
    }
}
