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

            Never share this code with anyone. Índice support will never ask for it.

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
            <html lang="en">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <meta name="color-scheme" content="light">
                <style>
                  @media only screen and (max-width:640px) {
                    .email-outer { padding:20px 12px !important; }
                    .email-content { padding:28px 22px 24px !important; }
                    .email-code { font-size:34px !important; letter-spacing:.1em !important; }
                    .email-detail-label, .email-detail-value { display:block !important; width:100%% !important; text-align:left !important; }
                    .email-detail-value { padding-top:4px !important; }
                  }
                </style>
              </head>
              <body style="margin:0;background:#F7F8FA;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#222831;">
                <div style="display:none;max-height:0;overflow:hidden;color:#F7F8FA;">Your Índice sign-in code expires in %d minutes.</div>
                <table role="presentation" width="100%%" style="width:100%%;border-collapse:collapse;background:#F7F8FA;">
                  <tr>
                    <td class="email-outer" style="padding:36px 16px;">
                      <table role="presentation" width="100%%" style="width:100%%;max-width:600px;margin:0 auto;border-collapse:separate;border-spacing:0;">
                        <tr>
                          <td style="background:#FFFFFF;border:1px solid #D8DCE3;border-radius:20px;box-shadow:0 18px 48px rgba(34,40,49,.10);overflow:hidden;">
                            <div style="height:6px;background:#143675;font-size:0;line-height:0;">&nbsp;</div>
                            <div class="email-content" style="padding:34px 36px 30px;">
                              <table role="presentation" style="border-collapse:collapse;margin:0 0 30px;">
                                <tr>
                                  <td valign="bottom" style="padding:0 3px 0 0;"><div style="width:8px;height:22px;border-radius:4px 4px 3px 3px;background:#FF6B5E;font-size:0;line-height:0;">&nbsp;</div></td>
                                  <td valign="bottom" style="padding:0 3px 0 0;"><div style="width:8px;height:30px;border-radius:4px 4px 3px 3px;background:#F4C84A;font-size:0;line-height:0;">&nbsp;</div></td>
                                  <td valign="bottom" style="padding:0 3px 0 0;"><div style="width:8px;height:38px;border-radius:4px 4px 3px 3px;background:#59C3A5;font-size:0;line-height:0;">&nbsp;</div></td>
                                  <td valign="bottom"><div style="width:8px;height:46px;border-radius:4px 4px 3px 3px;background:#2563EB;font-size:0;line-height:0;">&nbsp;</div></td>
                                  <td valign="bottom" style="padding:0 0 4px 11px;color:#2563EB;font-size:25px;line-height:1;font-weight:600;">Índice</td>
                                </tr>
                              </table>
                              <p style="display:inline-block;margin:0 0 16px;padding:7px 11px;border:1px solid #BFDBFE;border-radius:999px;background:#EFF6FF;color:#143675;font-size:12px;line-height:1.3;font-weight:500;">Secure sign-in</p>
                              <h1 style="margin:0 0 12px;font-size:28px;line-height:1.22;font-weight:500;color:#222831;">Confirm your sign-in</h1>
                              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;font-weight:400;color:#4B5563;">Hi %s, use this verification code to finish signing in to <span style="color:#222831;font-weight:500;">%s</span>.</p>
                              <div style="margin:0 0 24px;padding:24px;border:1px solid #BFDBFE;border-radius:14px;background:#EFF6FF;text-align:center;">
                                <p style="margin:0 0 9px;color:#143675;font-size:13px;line-height:1.4;font-weight:500;">Verification code</p>
                                <div class="email-code" style="font-family:'Courier New',Courier,monospace;font-size:40px;line-height:1.15;font-weight:600;letter-spacing:.12em;color:#222831;font-variant-numeric:tabular-nums;">%s</div>
                                <p style="margin:12px 0 0;color:#64748B;font-size:13px;line-height:1.4;font-weight:400;">Expires in %d minutes</p>
                              </div>
                              <table role="presentation" width="100%%" style="width:100%%;border-collapse:collapse;margin:0 0 24px;">
                                <tr>
                                  <td class="email-detail-label" style="padding:13px 0;color:#64748B;font-size:13px;line-height:1.45;font-weight:400;border-bottom:1px solid #E5E7EB;">Workspace</td>
                                  <td class="email-detail-value" style="padding:13px 0;color:#222831;font-size:13px;line-height:1.45;font-weight:500;text-align:right;border-bottom:1px solid #E5E7EB;">%s</td>
                                </tr>
                              </table>
                              <div style="margin:0;padding:16px 18px;border-left:4px solid #59C3A5;border-radius:10px;background:#E7F3F2;">
                                <p style="margin:0 0 5px;color:#222831;font-size:14px;line-height:1.45;font-weight:500;">Keep this code private</p>
                                <p style="margin:0;color:#4B5563;font-size:13px;line-height:1.6;font-weight:400;">Índice support will never ask for this code. If you did not try to sign in, you can ignore this email or contact your workspace administrator.</p>
                              </div>
                              <p style="margin:26px 0 0;font-size:14px;line-height:1.5;font-weight:400;color:#222831;">The Índice team</p>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:18px 10px 0;text-align:center;color:#64748B;font-size:12px;line-height:1.6;font-weight:400;">This automated message protects access to your Índice workspace.<br><span style="color:#143675;">www.indiceapp.com</span></td>
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
