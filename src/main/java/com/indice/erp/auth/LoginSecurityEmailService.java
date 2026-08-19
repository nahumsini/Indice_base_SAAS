package com.indice.erp.auth;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
public class LoginSecurityEmailService {

    private static final Logger log = LoggerFactory.getLogger(LoginSecurityEmailService.class);
    private static final String SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";
    private static final String LOGIN_SUCCESS_SUBJECT = "Security alert: new sign-in to your Indice account";
    private static final String PASSWORD_FAILURE_SUBJECT = "Security alert: unsuccessful sign-in attempt";
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter
        .ofPattern("yyyy-MM-dd HH:mm 'UTC'")
        .withZone(ZoneOffset.UTC);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final RestClient restClient;
    private final Clock clock;
    private final AuthSecurityProperties securityProperties;
    private final boolean enabled;
    private final String provider;
    private final String fromAddress;
    private final String fromName;
    private final String replyToAddress;
    private final String sendgridApiKey;

    LoginSecurityEmailService(
        ObjectProvider<JavaMailSender> mailSenderProvider,
        RestClient.Builder restClientBuilder,
        Clock clock,
        AuthSecurityProperties securityProperties,
        @Value("${app.email.enabled:true}") boolean enabled,
        @Value("${app.email.provider:sendgrid}") String provider,
        @Value("${app.email.from:no-reply@indice.local}") String fromAddress,
        @Value("${app.email.from-name:Indice ERP}") String fromName,
        @Value("${app.email.reply-to:}") String replyToAddress,
        @Value("${app.email.sendgrid.api-key:}") String sendgridApiKey
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.restClient = restClientBuilder.build();
        this.clock = clock;
        this.securityProperties = securityProperties;
        this.enabled = enabled;
        this.provider = clean(provider, "smtp").toLowerCase();
        this.fromAddress = clean(fromAddress, "");
        this.fromName = clean(fromName, "");
        this.replyToAddress = clean(replyToAddress, "");
        this.sendgridApiKey = clean(sendgridApiKey, "");
    }

    public DeliveryResult sendLoginSuccess(AuthenticatedLogin login, LoginAuditContext context) {
        if (login == null || clean(login.email(), "").isBlank()) {
            return DeliveryResult.skipped("Login email recipient is missing.");
        }
        return send(new SecurityEmail(
            login.email(),
            LOGIN_SUCCESS_SUBJECT,
            successText(login, context),
            successHtml(login, context)
        ));
    }

    public DeliveryResult sendPasswordFailure(
        LoginCredentialVerificationResult verification,
        AuthLockoutService.LockoutState lockout,
        LoginAuditContext context
    ) {
        if (!shouldNotifyPasswordFailure(verification)) {
            return DeliveryResult.skipped("Password failure notification is not safe for this attempt.");
        }
        var email = clean(verification.emailNormalized(), "");
        return send(new SecurityEmail(
            email,
            PASSWORD_FAILURE_SUBJECT,
            failureText(verification, lockout, context),
            failureHtml(verification, lockout, context)
        ));
    }

    private boolean shouldNotifyPasswordFailure(LoginCredentialVerificationResult verification) {
        return verification != null
            && verification.userId() != null
            && AuthFailureReason.PASSWORD_INVALID.equals(verification.failureReasonCode())
            && !clean(verification.emailNormalized(), "").isBlank();
    }

    private DeliveryResult send(SecurityEmail email) {
        if (!enabled) {
            return DeliveryResult.disabled();
        }
        try {
            var result = "sendgrid".equals(provider)
                ? sendWithSendGrid(email)
                : sendWithSmtp(email);
            if (!result.sent()) {
                log.warn("Login security email was not sent to {}: {}", email.to(), result.message());
            }
            return result;
        } catch (RuntimeException exception) {
            log.warn("Unable to send login security email to {}", email.to(), exception);
            return DeliveryResult.failed("Unable to send login security email.");
        }
    }

    private DeliveryResult sendWithSmtp(SecurityEmail email) {
        if (!provider.isBlank() && !"smtp".equals(provider)) {
            return DeliveryResult.failed("Unsupported email provider: " + provider + ".");
        }
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
            message.setTo(email.to());
            message.setSubject(email.subject());
            message.setText(email.textBody());
            mailSender.send(message);
            return DeliveryResult.sentResult();
        } catch (MailException exception) {
            return DeliveryResult.failed("Unable to send login security email: " + exception.getMessage());
        }
    }

    private DeliveryResult sendWithSendGrid(SecurityEmail email) {
        if (sendgridApiKey.isBlank()) {
            return DeliveryResult.failed("SendGrid API key is not configured.");
        }
        if (fromAddress.isBlank()) {
            return DeliveryResult.failed("Email from address is not configured.");
        }
        try {
            restClient.post()
                .uri(SENDGRID_URL)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + sendgridApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(sendGridPayload(email))
                .retrieve()
                .toBodilessEntity();
            return DeliveryResult.sentResult();
        } catch (RestClientResponseException exception) {
            return DeliveryResult.failed("SendGrid returned HTTP " + exception.getStatusCode().value() + ".");
        } catch (RestClientException exception) {
            return DeliveryResult.failed("Unable to send login security email: " + exception.getMessage());
        }
    }

    private Map<String, Object> sendGridPayload(SecurityEmail email) {
        var from = new LinkedHashMap<String, Object>();
        from.put("email", fromAddress);
        if (!fromName.isBlank()) {
            from.put("name", fromName);
        }
        var payload = new LinkedHashMap<String, Object>();
        payload.put("personalizations", List.of(Map.of(
            "to", List.of(Map.of("email", email.to())),
            "subject", email.subject()
        )));
        payload.put("from", from);
        if (!replyToAddress.isBlank()) {
            payload.put("reply_to", Map.of("email", replyToAddress));
        }
        payload.put("content", List.of(
            Map.of("type", "text/plain", "value", email.textBody()),
            Map.of("type", "text/html", "value", email.htmlBody())
        ));
        return payload;
    }

    private String successText(AuthenticatedLogin login, LoginAuditContext context) {
        return """
            Hi %s,

            Your Indice account was just used to sign in.

            Workspace: %s
            Email: %s
            Time: %s
            Location signal: %s
            Device / browser: %s

            If this was you, no action is needed.
            If this was not you, reset your password immediately and contact your workspace administrator.

            The Indice Team
            """.formatted(
                firstName(login.fullName()),
                clean(login.companyName(), "Unknown workspace"),
                clean(login.email(), "Unknown email"),
                currentTime(),
                locationSignal(context),
                userAgent(context)
            );
    }

    private String failureText(
        LoginCredentialVerificationResult verification,
        AuthLockoutService.LockoutState lockout,
        LoginAuditContext context
    ) {
        return """
            Hi,

            We noticed an unsuccessful sign-in attempt for your Indice account because the password was incorrect.

            Workspace entered: %s
            Email: %s
            Time: %s
            Location signal: %s
            Device / browser: %s
            Attempts used: %d of %d
            Account status: %s

            If this was you, try again carefully or reset your password from the login page.
            If this was not you, reset your password and notify your workspace administrator.

            The Indice Team
            """.formatted(
                clean(verification.companyNameNormalized(), "Unknown workspace"),
                clean(verification.emailNormalized(), "Unknown email"),
                currentTime(),
                locationSignal(context),
                userAgent(context),
                lockout == null ? 0 : lockout.failureCount(),
                securityProperties.getLoginLockoutAttempts(),
                lockoutStatus(lockout)
            );
    }

    private String successHtml(AuthenticatedLogin login, LoginAuditContext context) {
        var facts = new LinkedHashMap<String, String>();
        facts.put("Workspace", clean(login.companyName(), "Unknown workspace"));
        facts.put("Email", clean(login.email(), "Unknown email"));
        facts.put("Time", currentTime());
        facts.put("Location signal", locationSignal(context));
        facts.put("Device / browser", userAgent(context));
        return htmlMessage(
            "New sign-in to your Indice account",
            "Your Indice account was just used to sign in.",
            facts,
            "If this was you, no action is needed. If this was not you, reset your password immediately and contact your workspace administrator."
        );
    }

    private String failureHtml(
        LoginCredentialVerificationResult verification,
        AuthLockoutService.LockoutState lockout,
        LoginAuditContext context
    ) {
        var facts = new LinkedHashMap<String, String>();
        facts.put("Workspace entered", clean(verification.companyNameNormalized(), "Unknown workspace"));
        facts.put("Email", clean(verification.emailNormalized(), "Unknown email"));
        facts.put("Time", currentTime());
        facts.put("Location signal", locationSignal(context));
        facts.put("Device / browser", userAgent(context));
        facts.put("Attempts used", (lockout == null ? 0 : lockout.failureCount()) + " of " + securityProperties.getLoginLockoutAttempts());
        facts.put("Account status", lockoutStatus(lockout));
        return htmlMessage(
            "Unsuccessful sign-in attempt",
            "We noticed an unsuccessful sign-in attempt for your Indice account because the password was incorrect.",
            facts,
            "If this was you, try again carefully or reset your password from the login page. If this was not you, reset your password and notify your workspace administrator."
        );
    }

    private String htmlMessage(String heading, String intro, Map<String, String> facts, String action) {
        var rows = new StringBuilder();
        facts.forEach((label, value) -> rows.append("""
            <tr>
              <td style="padding:10px 0;color:#60708c;font-size:13px;">%s</td>
              <td style="padding:10px 0;color:#172033;font-size:13px;font-weight:600;text-align:right;">%s</td>
            </tr>
            """.formatted(escape(label), escape(value))));
        return """
            <!doctype html>
            <html>
              <body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033;">
                <div style="max-width:620px;margin:0 auto;padding:32px 16px;">
                  <div style="background:#ffffff;border:1px solid #dfe6f1;border-radius:8px;padding:28px;">
                    <p style="margin:0 0 8px;color:#008f73;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Indice Security</p>
                    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#172033;">%s</h1>
                    <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#42526e;">%s</p>
                    <table role="presentation" style="width:100%%;border-collapse:collapse;border-top:1px solid #e6ecf5;border-bottom:1px solid #e6ecf5;">%s</table>
                    <p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#42526e;">%s</p>
                    <p style="margin:24px 0 0;font-size:14px;color:#172033;">The Indice Team</p>
                  </div>
                </div>
              </body>
            </html>
            """.formatted(escape(heading), escape(intro), rows, escape(action));
    }

    private String lockoutStatus(AuthLockoutService.LockoutState lockout) {
        if (lockout == null || !lockout.locked()) {
            return "Not locked";
        }
        return "Temporarily locked until " + formatTime(lockout.lockedUntil());
    }

    private String currentTime() {
        return formatTime(clock.instant());
    }

    private String formatTime(Instant instant) {
        return instant == null ? "Unknown" : TIME_FORMATTER.format(instant);
    }

    private String locationSignal(LoginAuditContext context) {
        var ip = context == null ? "" : clean(context.ipAddress(), "");
        return ip.isBlank() ? "Unavailable" : "IP address " + truncate(ip, 80);
    }

    private String userAgent(LoginAuditContext context) {
        var userAgent = context == null ? "" : clean(context.userAgent(), "");
        return userAgent.isBlank() ? "Unavailable" : truncate(userAgent, 180);
    }

    private String firstName(String fullName) {
        var cleaned = clean(fullName, "there");
        var space = cleaned.indexOf(' ');
        return space > 0 ? cleaned.substring(0, space) : cleaned;
    }

    private String clean(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String truncate(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength - 1) + "...";
    }

    private String escape(String value) {
        return clean(value, "")
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }

    private record SecurityEmail(String to, String subject, String textBody, String htmlBody) {
    }

    public record DeliveryResult(boolean sent, String status, String message) {
        static DeliveryResult sentResult() {
            return new DeliveryResult(true, "sent", "");
        }

        static DeliveryResult disabled() {
            return new DeliveryResult(false, "disabled", "Email delivery is disabled.");
        }

        static DeliveryResult skipped(String message) {
            return new DeliveryResult(false, "skipped", message);
        }

        static DeliveryResult failed(String message) {
            return new DeliveryResult(false, "failed", message);
        }
    }
}
