package com.indice.erp.auth;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
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
        message.setText(textBody(welcome));
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
        payload.put("content", List.of(
            Map.of("type", "text/plain", "value", textBody(welcome)),
            Map.of("type", "text/html", "value", htmlBody(welcome))
        ));
        return payload;
    }

    private String textBody(WorkspaceWelcomeEmail welcome) {
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

    private String htmlBody(WorkspaceWelcomeEmail welcome) {
        var firstName = escape(firstName(welcome.fullName()));
        var companyName = escape(clean(welcome.companyName(), "your workspace"));
        var email = escape(clean(welcome.email(), ""));
        var loginHref = escape(loginUrl);
        var support = escape(supportEmail());
        var trialStatus = welcome.trialEnd() == null ? "Active workspace" : "30-day trial active";
        return """
            <!doctype html>
            <html>
              <body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
                <div style="display:none;max-height:0;overflow:hidden;color:#f4f7fb;">Your Indice workspace is ready.</div>
                <table role="presentation" style="width:100%%;border-collapse:collapse;background:#f4f7fb;">
                  <tr>
                    <td style="padding:36px 16px;">
                      <table role="presentation" style="width:100%%;max-width:640px;margin:0 auto;border-collapse:collapse;">
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
                              <p style="display:inline-block;margin:0 0 18px;padding:7px 12px;border-radius:999px;background:#e7fbf5;color:#008f73;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">Workspace ready</p>
                              <h1 style="margin:0 0 12px;font-size:28px;line-height:1.25;color:#172033;">Welcome to Indice</h1>
                              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#42526e;">Hi %s, your workspace <strong style="color:#172033;">%s</strong> has been created successfully. You can now sign in and start setting up your team, modules, and daily operations.</p>
                              <div style="margin:0 0 24px;text-align:center;">
                                <a href="%s" style="display:inline-block;background:#008f73;color:#ffffff;text-decoration:none;border-radius:8px;padding:14px 24px;font-size:15px;font-weight:700;">Open your workspace</a>
                              </div>
                              <table role="presentation" style="width:100%%;border-collapse:collapse;margin:0 0 24px;border-top:1px solid #e6ecf5;border-bottom:1px solid #e6ecf5;">
                                <tr>
                                  <td style="padding:12px 0;color:#60708c;font-size:13px;">Workspace / Company</td>
                                  <td style="padding:12px 0;color:#172033;font-size:13px;font-weight:700;text-align:right;">%s</td>
                                </tr>
                                <tr>
                                  <td style="padding:12px 0;color:#60708c;font-size:13px;border-top:1px solid #e6ecf5;">Email</td>
                                  <td style="padding:12px 0;color:#172033;font-size:13px;font-weight:700;text-align:right;border-top:1px solid #e6ecf5;">%s</td>
                                </tr>
                                <tr>
                                  <td style="padding:12px 0;color:#60708c;font-size:13px;border-top:1px solid #e6ecf5;">Password</td>
                                  <td style="padding:12px 0;color:#172033;font-size:13px;font-weight:700;text-align:right;border-top:1px solid #e6ecf5;">The password created during signup</td>
                                </tr>
                                <tr>
                                  <td style="padding:12px 0;color:#60708c;font-size:13px;border-top:1px solid #e6ecf5;">Status</td>
                                  <td style="padding:12px 0;color:#008f73;font-size:13px;font-weight:700;text-align:right;border-top:1px solid #e6ecf5;">%s</td>
                                </tr>
                              </table>
                              <div style="margin:0;padding:18px;border:1px solid #d9f4eb;border-radius:10px;background:#f0fdf9;">
                                <p style="margin:0;font-size:14px;line-height:1.65;color:#42526e;">Start by reviewing your company profile, users, roles, and selected modules. For help getting started, contact <a href="mailto:%s" style="color:#008f73;font-weight:700;text-decoration:none;">%s</a>.</p>
                              </div>
                              <p style="margin:26px 0 0;font-size:14px;color:#172033;">Welcome aboard,<br>The Índice Team</p>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:16px 4px 0;text-align:center;color:#7b88a0;font-size:12px;line-height:1.5;">This automated message confirms access to your Indice workspace.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            """.formatted(firstName, companyName, loginHref, companyName, email, escape(trialStatus), support, support);
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

    private String escape(String value) {
        return clean(value, "")
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }

    public record WorkspaceWelcomeEmail(
        String fullName,
        String email,
        String companyName,
        Instant trialEnd
    ) {
    }
}
