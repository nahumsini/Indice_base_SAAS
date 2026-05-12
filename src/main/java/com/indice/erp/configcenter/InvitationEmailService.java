package com.indice.erp.configcenter;

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
public class InvitationEmailService {

    private static final String SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";
    private static final String INVITATION_SUBJECT = "You have been invited to Indice";

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final RestClient restClient;
    private final boolean enabled;
    private final String provider;
    private final String fromAddress;
    private final String fromName;
    private final String replyToAddress;
    private final String sendgridApiKey;

    public InvitationEmailService(
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

    public InvitationEmailResult sendInvitation(String email, String fullName, String inviteLink) {
        if (!enabled) {
            return InvitationEmailResult.disabled();
        }

        if (provider.equals("sendgrid")) {
            return sendWithSendGrid(email, fullName, inviteLink);
        }

        if (!provider.isBlank() && !provider.equals("smtp")) {
            return InvitationEmailResult.failed("Unsupported email provider: " + provider + ".");
        }

        return sendWithSmtp(email, fullName, inviteLink);
    }

    private InvitationEmailResult sendWithSmtp(String email, String fullName, String inviteLink) {
        var mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            return InvitationEmailResult.failed("Mail sender is not configured.");
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
            message.setSubject(INVITATION_SUBJECT);
            message.setText(buildInvitationText(fullName, inviteLink));
            mailSender.send(message);
            return InvitationEmailResult.sentSuccessfully();
        } catch (MailException ex) {
            return InvitationEmailResult.failed("Unable to send invitation email: " + ex.getMessage());
        }
    }

    private InvitationEmailResult sendWithSendGrid(String email, String fullName, String inviteLink) {
        if (sendgridApiKey.isBlank()) {
            return InvitationEmailResult.failed("SendGrid API key is not configured.");
        }

        if (fromAddress.isBlank()) {
            return InvitationEmailResult.failed("Email from address is not configured.");
        }

        try {
            restClient.post()
                .uri(SENDGRID_URL)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + sendgridApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(sendGridPayload(email, fullName, inviteLink))
                .retrieve()
                .toBodilessEntity();
            return InvitationEmailResult.sentSuccessfully();
        } catch (RestClientResponseException ex) {
            return InvitationEmailResult.failed("Unable to send invitation email: SendGrid returned HTTP " + ex.getStatusCode().value() + ".");
        } catch (RestClientException ex) {
            return InvitationEmailResult.failed("Unable to send invitation email: " + ex.getMessage());
        }
    }

    private Map<String, Object> sendGridPayload(String email, String fullName, String inviteLink) {
        var from = new LinkedHashMap<String, Object>();
        from.put("email", fromAddress);
        if (!fromName.isBlank()) {
            from.put("name", fromName);
        }

        var recipient = new LinkedHashMap<String, Object>();
        recipient.put("email", email);

        var personalization = new LinkedHashMap<String, Object>();
        personalization.put("to", java.util.Collections.singletonList(recipient));
        personalization.put("subject", INVITATION_SUBJECT);

        var payload = new LinkedHashMap<String, Object>();
        payload.put("personalizations", java.util.Collections.singletonList(personalization));
        payload.put("from", from);
        if (!replyToAddress.isBlank()) {
            var replyTo = new LinkedHashMap<String, Object>();
            replyTo.put("email", replyToAddress);
            payload.put("reply_to", replyTo);
        }

        var content = new LinkedHashMap<String, Object>();
        content.put("type", "text/plain");
        content.put("value", buildInvitationText(fullName, inviteLink));
        payload.put("content", java.util.Collections.singletonList(content));
        return payload;
    }

    private String buildInvitationText(String fullName, String inviteLink) {
        var greetingName = fullName == null || fullName.isBlank() ? "there" : fullName.trim();
        return """
            Hi %s,

            You have been invited to join Indice.

            Open this link to accept the invitation and create your password:
            %s

            This invitation expires in 7 days.
            """.formatted(greetingName, inviteLink);
    }
}
