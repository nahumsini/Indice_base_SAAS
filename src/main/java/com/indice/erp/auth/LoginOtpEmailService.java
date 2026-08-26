package com.indice.erp.auth;

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
public class LoginOtpEmailService {

    private static final String SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";
    private static final String SUBJECT = "Your Índice verification code";

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final RestClient restClient;
    private final boolean enabled;
    private final String provider;
    private final String fromAddress;
    private final String fromName;
    private final String replyToAddress;
    private final String sendgridApiKey;

    public LoginOtpEmailService(
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

    public DeliveryResult sendOtp(AuthenticatedLogin login, String otpCode, int ttlSeconds) {
        if (!enabled) {
            return DeliveryResult.disabledResult();
        }
        if ("sendgrid".equals(provider)) {
            return sendWithSendGrid(login, otpCode, ttlSeconds);
        }
        if (!provider.isBlank() && !"smtp".equals(provider)) {
            return DeliveryResult.failed("Unsupported email provider.");
        }
        return sendWithSmtp(login, otpCode, ttlSeconds);
    }

    private DeliveryResult sendWithSmtp(AuthenticatedLogin login, String otpCode, int ttlSeconds) {
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
            message.setTo(login.email());
            message.setSubject(SUBJECT);
            message.setText(textBody(login, otpCode, ttlSeconds));
            mailSender.send(message);
            return DeliveryResult.sentResult();
        } catch (MailException exception) {
            return DeliveryResult.failed("Unable to send verification code.");
        }
    }

    private DeliveryResult sendWithSendGrid(AuthenticatedLogin login, String otpCode, int ttlSeconds) {
        if (sendgridApiKey.isBlank() || fromAddress.isBlank()) {
            return DeliveryResult.failed("SendGrid API key or from address is not configured.");
        }
        try {
            restClient.post()
                .uri(SENDGRID_URL)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + sendgridApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(sendGridPayload(login, otpCode, ttlSeconds))
                .retrieve()
                .toBodilessEntity();
            return DeliveryResult.sentResult();
        } catch (RestClientResponseException exception) {
            return DeliveryResult.failed("SendGrid returned HTTP " + exception.getStatusCode().value() + ".");
        } catch (RestClientException exception) {
            return DeliveryResult.failed("Unable to send verification code.");
        }
    }

    private Map<String, Object> sendGridPayload(AuthenticatedLogin login, String otpCode, int ttlSeconds) {
        var from = new LinkedHashMap<String, Object>();
        from.put("email", fromAddress);
        if (!fromName.isBlank()) {
            from.put("name", fromName);
        }
        var recipient = Map.<String, Object>of("email", login.email());
        var personalization = Map.<String, Object>of("to", java.util.List.of(recipient), "subject", SUBJECT);
        var payload = new LinkedHashMap<String, Object>();
        payload.put("personalizations", java.util.List.of(personalization));
        payload.put("from", from);
        if (!replyToAddress.isBlank()) {
            payload.put("reply_to", Map.of("email", replyToAddress));
        }
        payload.put("content", List.of(
            Map.of("type", "text/plain", "value", textBody(login, otpCode, ttlSeconds)),
            Map.of("type", "text/html", "value", htmlBody(login, otpCode, ttlSeconds))
        ));
        return payload;
    }

    private String textBody(AuthenticatedLogin login, String otpCode, int ttlSeconds) {
        var minutes = Math.max(1, ttlSeconds / 60);
        return """
            Hi %s,

            Your sign-in verification code for %s is:

            %s

            This code expires in %d minutes.

            Never share this code with anyone. Indice support will never ask for it.

            If you did not try to sign in, you can ignore this email or contact your workspace administrator.

            The Índice Team
            """.formatted(firstName(login.fullName()), login.companyName(), otpCode, minutes);
    }

    private String htmlBody(AuthenticatedLogin login, String otpCode, int ttlSeconds) {
        var minutes = Math.max(1, ttlSeconds / 60);
        var firstName = escape(firstName(login.fullName()));
        var companyName = escape(clean(login.companyName(), "your workspace"));
        var code = escape(groupCode(otpCode));
        return """
            <!doctype html>
            <html>
              <body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
                <div style="display:none;max-height:0;overflow:hidden;color:#f4f7fb;">Your Indice sign-in code expires in %d minutes.</div>
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
                              <p style="display:inline-block;margin:0 0 18px;padding:7px 12px;border-radius:999px;background:#e7fbf5;color:#008f73;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">Secure sign-in</p>
                              <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:#172033;">Confirm your sign-in</h1>
                              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#42526e;">Hi %s, use this verification code to finish signing in to <strong style="color:#172033;">%s</strong>.</p>
                              <div style="margin:0 0 24px;padding:24px;border:1px solid #d9f4eb;border-radius:10px;background:#f0fdf9;text-align:center;">
                                <p style="margin:0 0 8px;color:#008f73;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Verification code</p>
                                <div style="font-family:'Courier New',Courier,monospace;font-size:38px;line-height:1.15;font-weight:800;letter-spacing:.14em;color:#172033;">%s</div>
                                <p style="margin:12px 0 0;color:#60708c;font-size:13px;">Expires in %d minutes</p>
                              </div>
                              <table role="presentation" style="width:100%%;border-collapse:collapse;margin:0 0 24px;border-top:1px solid #e6ecf5;border-bottom:1px solid #e6ecf5;">
                                <tr>
                                  <td style="padding:12px 0;color:#60708c;font-size:13px;">Workspace</td>
                                  <td style="padding:12px 0;color:#172033;font-size:13px;font-weight:700;text-align:right;">%s</td>
                                </tr>
                                <tr>
                                  <td style="padding:12px 0;color:#60708c;font-size:13px;border-top:1px solid #e6ecf5;">Security note</td>
                                  <td style="padding:12px 0;color:#172033;font-size:13px;font-weight:700;text-align:right;border-top:1px solid #e6ecf5;">Do not share this code</td>
                                </tr>
                              </table>
                              <p style="margin:0;font-size:14px;line-height:1.65;color:#42526e;">Indice support will never ask for this code. If you did not try to sign in, you can ignore this email or contact your workspace administrator.</p>
                              <p style="margin:26px 0 0;font-size:14px;color:#172033;">The Índice Team</p>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:16px 4px 0;text-align:center;color:#7b88a0;font-size:12px;line-height:1.5;">This automated message was sent to protect access to your Indice workspace.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            """.formatted(minutes, firstName, companyName, code, minutes, companyName);
    }

    private String firstName(String fullName) {
        var cleaned = clean(fullName, "there");
        var space = cleaned.indexOf(' ');
        return space > 0 ? cleaned.substring(0, space) : cleaned;
    }

    private String clean(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String groupCode(String otpCode) {
        var cleaned = clean(otpCode, "").replaceAll("\\D", "");
        if (cleaned.length() == 6) {
            return cleaned.substring(0, 3) + " " + cleaned.substring(3);
        }
        return clean(otpCode, "");
    }

    private String escape(String value) {
        return clean(value, "")
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }

    public record DeliveryResult(boolean sent, String status, String message) {
        static DeliveryResult sentResult() {
            return new DeliveryResult(true, "sent", "");
        }

        static DeliveryResult disabledResult() {
            return new DeliveryResult(false, "disabled", "Email delivery is disabled.");
        }

        static DeliveryResult failed(String message) {
            return new DeliveryResult(false, "failed", message);
        }
    }
}
