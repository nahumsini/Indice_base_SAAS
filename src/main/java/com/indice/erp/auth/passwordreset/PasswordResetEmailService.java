package com.indice.erp.auth.passwordreset;

import java.util.LinkedHashMap;
import java.util.List;
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
public class PasswordResetEmailService {

    private static final String SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";
    private static final String PASSWORD_RESET_SUBJECT = "Reset your Indice password";

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final RestClient restClient;
    private final boolean enabled;
    private final String provider;
    private final String fromAddress;
    private final String fromName;
    private final String replyToAddress;
    private final String sendgridApiKey;

    public PasswordResetEmailService(
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
        this.provider = provider == null ? "smtp" : provider.trim().toLowerCase();
        this.fromAddress = fromAddress == null ? "" : fromAddress.trim();
        this.fromName = fromName == null ? "" : fromName.trim();
        this.replyToAddress = replyToAddress == null ? "" : replyToAddress.trim();
        this.sendgridApiKey = sendgridApiKey == null ? "" : sendgridApiKey.trim();
    }

    public EmailDeliveryResult sendPasswordReset(String email, String fullName, String resetLink) {
        if (!enabled) {
            return EmailDeliveryResult.disabled();
        }

        if (provider.equals("sendgrid")) {
            return sendWithSendGrid(email, fullName, resetLink);
        }

        if (!provider.isBlank() && !provider.equals("smtp")) {
            return EmailDeliveryResult.failed("Unsupported email provider: " + provider + ".");
        }

        return sendWithSmtp(email, fullName, resetLink);
    }

    private EmailDeliveryResult sendWithSmtp(String email, String fullName, String resetLink) {
        var mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            return EmailDeliveryResult.failed("Mail sender is not configured.");
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
            message.setSubject(PASSWORD_RESET_SUBJECT);
            message.setText(buildPasswordResetText(fullName, resetLink));
            mailSender.send(message);
            return EmailDeliveryResult.sentSuccessfully();
        } catch (MailException ex) {
            return EmailDeliveryResult.failed("Unable to send password reset email: " + ex.getMessage());
        }
    }

    private EmailDeliveryResult sendWithSendGrid(String email, String fullName, String resetLink) {
        if (sendgridApiKey.isBlank()) {
            return EmailDeliveryResult.failed("SendGrid API key is not configured.");
        }

        if (fromAddress.isBlank()) {
            return EmailDeliveryResult.failed("Email from address is not configured.");
        }

        try {
            restClient.post()
                .uri(SENDGRID_URL)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + sendgridApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(sendGridPayload(email, fullName, resetLink))
                .retrieve()
                .toBodilessEntity();
            return EmailDeliveryResult.sentSuccessfully();
        } catch (RestClientResponseException ex) {
            return EmailDeliveryResult.failed("Unable to send password reset email: SendGrid returned HTTP " + ex.getStatusCode().value() + ".");
        } catch (RestClientException ex) {
            return EmailDeliveryResult.failed("Unable to send password reset email: " + ex.getMessage());
        }
    }

    private Map<String, Object> sendGridPayload(String email, String fullName, String resetLink) {
        var from = new LinkedHashMap<String, Object>();
        from.put("email", fromAddress);
        if (!fromName.isBlank()) {
            from.put("name", fromName);
        }

        var recipient = new LinkedHashMap<String, Object>();
        recipient.put("email", email);

        var personalization = new LinkedHashMap<String, Object>();
        personalization.put("to", java.util.Collections.singletonList(recipient));
        personalization.put("subject", PASSWORD_RESET_SUBJECT);

        var payload = new LinkedHashMap<String, Object>();
        payload.put("personalizations", java.util.Collections.singletonList(personalization));
        payload.put("from", from);
        if (!replyToAddress.isBlank()) {
            var replyTo = new LinkedHashMap<String, Object>();
            replyTo.put("email", replyToAddress);
            payload.put("reply_to", replyTo);
        }

        payload.put("content", List.of(
            Map.of("type", "text/plain", "value", buildPasswordResetText(fullName, resetLink)),
            Map.of("type", "text/html", "value", buildPasswordResetHtml(fullName, email, resetLink))
        ));
        return payload;
    }

    private String buildPasswordResetText(String fullName, String resetLink) {
        var greetingName = fullName == null || fullName.isBlank() ? "there" : fullName.trim();
        return """
            Hi %s,

            We received a request to reset your Indice password.

            Open this link within 10 minutes to set a new password:
            %s

            If you did not request this, ignore this email. Your current password will remain unchanged.
            """.formatted(greetingName, resetLink);
    }

    private String buildPasswordResetHtml(String fullName, String email, String resetLink) {
        var greetingName = escape(firstName(fullName));
        var accountEmail = escape(clean(email, "your account"));
        var resetHref = escape(clean(resetLink, "#"));
        return """
            <!doctype html>
            <html>
              <body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
                <div style="display:none;max-height:0;overflow:hidden;color:#f4f7fb;">Reset your Indice password. This link expires in 10 minutes.</div>
                <table role="presentation" style="width:100%%;border-collapse:collapse;background:#f4f7fb;">
                  <tr>
                    <td style="padding:36px 16px;">
                      <table role="presentation" style="width:100%%;max-width:620px;margin:0 auto;border-collapse:collapse;">
                        <tr>
                          <td style="padding:0 0 14px;">
                            <table role="presentation" style="border-collapse:collapse;">
                              <tr>
                                <td style="width:7px;height:26px;background:#ff4d5d;border-radius:4px;"></td>
                                <td style="width:7px;height:34px;background:#ffd335;border-radius:4px;"></td>
                                <td style="width:7px;height:42px;background:#20c997;border-radius:4px;"></td>
                                <td style="width:7px;height:50px;background:#4f46e5;border-radius:4px;"></td>
                                <td style="padding-left:10px;font-size:24px;font-weight:800;color:#4f46e5;">Indice</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="background:#ffffff;border:1px solid #dfe6f1;border-radius:12px;box-shadow:0 14px 36px rgba(23,32,51,.08);overflow:hidden;">
                            <div style="height:6px;background:linear-gradient(90deg,#20c997 0 25%%,#ffd335 25%% 50%%,#ff4d5d 50%% 75%%,#4f46e5 75%% 100%%);"></div>
                            <div style="padding:34px 34px 30px;">
                              <p style="display:inline-block;margin:0 0 18px;padding:7px 12px;border-radius:999px;background:#fff7df;color:#9a6700;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">Password reset</p>
                              <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:#172033;">Reset your password</h1>
                              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#42526e;">Hi %s, we received a request to reset the password for your Indice account.</p>
                              <div style="margin:0 0 24px;text-align:center;">
                                <a href="%s" style="display:inline-block;background:#008f73;color:#ffffff;text-decoration:none;border-radius:8px;padding:14px 24px;font-size:15px;font-weight:700;">Reset password</a>
                              </div>
                              <table role="presentation" style="width:100%%;border-collapse:collapse;margin:0 0 24px;border-top:1px solid #e6ecf5;border-bottom:1px solid #e6ecf5;">
                                <tr>
                                  <td style="padding:12px 0;color:#60708c;font-size:13px;">Account</td>
                                  <td style="padding:12px 0;color:#172033;font-size:13px;font-weight:700;text-align:right;">%s</td>
                                </tr>
                                <tr>
                                  <td style="padding:12px 0;color:#60708c;font-size:13px;border-top:1px solid #e6ecf5;">Link expires</td>
                                  <td style="padding:12px 0;color:#172033;font-size:13px;font-weight:700;text-align:right;border-top:1px solid #e6ecf5;">10 minutes</td>
                                </tr>
                              </table>
                              <div style="margin:0;padding:18px;border:1px solid #ffe2a8;border-radius:10px;background:#fffaf0;">
                                <p style="margin:0;font-size:14px;line-height:1.65;color:#42526e;">If you did not request this, ignore this email. Your current password will remain unchanged.</p>
                              </div>
                              <p style="margin:26px 0 0;font-size:14px;color:#172033;">The Índice Team</p>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:16px 4px 0;text-align:center;color:#7b88a0;font-size:12px;line-height:1.5;">This automated message was sent to help protect your Indice account.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            """.formatted(greetingName, resetHref, accountEmail);
    }

    private String firstName(String fullName) {
        var cleaned = clean(fullName, "there");
        var space = cleaned.indexOf(' ');
        return space > 0 ? cleaned.substring(0, space) : cleaned;
    }

    private String clean(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String escape(String value) {
        return clean(value, "")
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }
}
