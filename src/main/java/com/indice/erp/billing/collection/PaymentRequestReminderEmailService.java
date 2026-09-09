package com.indice.erp.billing.collection;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Service
public class PaymentRequestReminderEmailService {
    private static final String SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";
    private static final String SUBJECT = "Índice: recordatorio de pago";
    private final ObjectProvider<JavaMailSender> mailSenders;
    private final RestClient client;
    private final boolean enabled;
    private final String provider;
    private final String from;
    private final String fromName;
    private final String replyTo;
    private final String apiKey;
    private final String publicUrl;

    @Autowired
    public PaymentRequestReminderEmailService(
        ObjectProvider<JavaMailSender> mailSenders,
        @Value("${app.email.enabled:true}") boolean emailEnabled,
        @Value("${app.billing.collection.email-enabled:false}") boolean collectionEmailEnabled,
        @Value("${app.email.provider:sendgrid}") String provider,
        @Value("${app.email.from:}") String from,
        @Value("${app.email.from-name:Indice ERP}") String fromName,
        @Value("${app.email.reply-to:}") String replyTo,
        @Value("${app.email.sendgrid.api-key:}") String apiKey,
        @Value("${app.web.public-url:}") String publicUrl
    ) {
        this(mailSenders, boundedClient(), emailEnabled && collectionEmailEnabled,
            provider, from, fromName, replyTo, apiKey, publicUrl);
    }

    PaymentRequestReminderEmailService(ObjectProvider<JavaMailSender> mailSenders, RestClient client,
                                      boolean enabled, String provider, String from, String fromName,
                                      String replyTo, String apiKey, String publicUrl) {
        this.mailSenders = mailSenders;
        this.client = client;
        this.enabled = enabled;
        this.provider = clean(provider).toLowerCase(Locale.ROOT);
        this.from = clean(from);
        this.fromName = clean(fromName);
        this.replyTo = clean(replyTo);
        this.apiKey = clean(apiKey);
        this.publicUrl = clean(publicUrl);
    }

    public DeliveryResult send(PaymentRequestReminderRepository.Dispatch dispatch) {
        if (!enabled) return DeliveryResult.failure("EMAIL_DISABLED");
        if (from.isBlank() || dispatch.owner().email() == null || dispatch.owner().email().isBlank()) {
            return DeliveryResult.failure("EMAIL_ADDRESS_NOT_CONFIGURED");
        }
        var billingUrl = billingUrl();
        if (billingUrl == null) return DeliveryResult.failure("PUBLIC_URL_NOT_CONFIGURED");
        var body = """
            Hola %s:

            Hay una solicitud de pago pendiente para %s (referencia %s).
            Fecha límite: %s (UTC).

            Abre Facturación para consultar el importe y completar el pago:
            %s

            Si el pago sigue pendiente al vencer el plazo, el acceso operativo quedará limitado a la recuperación de facturación.
            El acceso se restablece cuando Índice verifica el pago solicitado. Si acabas de pagar, espera a que se confirme.

            Equipo Índice
            """.formatted(clean(dispatch.owner().name()), clean(dispatch.owner().companyName()),
                dispatch.reference(), dispatch.deadlineAt(), billingUrl);
        return switch (provider) {
            case "sendgrid" -> sendGrid(dispatch, body);
            case "smtp" -> smtp(dispatch, body);
            default -> DeliveryResult.failure("EMAIL_PROVIDER_UNSUPPORTED");
        };
    }

    /** Local configuration check only; this does not claim provider delivery was verified. */
    public boolean isConfigured() {
        if (!enabled || from.isBlank() || billingUrl() == null) return false;
        return switch (provider) {
            case "sendgrid" -> !apiKey.isBlank();
            case "smtp" -> mailSenders.getIfAvailable() != null;
            default -> false;
        };
    }

    private DeliveryResult sendGrid(PaymentRequestReminderRepository.Dispatch dispatch, String body) {
        if (apiKey.isBlank()) return DeliveryResult.failure("EMAIL_PROVIDER_NOT_CONFIGURED");
        var payload = new LinkedHashMap<String, Object>();
        payload.put("personalizations", List.of(Map.of("to", List.of(Map.of("email", dispatch.owner().email())),
            "subject", SUBJECT, "custom_args", Map.of("indice_delivery", dispatch.deliveryKey()))));
        payload.put("from", fromName.isBlank() ? Map.of("email", from) : Map.of("email", from, "name", fromName));
        if (!replyTo.isBlank()) payload.put("reply_to", Map.of("email", replyTo));
        payload.put("content", List.of(Map.of("type", "text/plain", "value", body)));
        try {
            var response = client.post().uri(SENDGRID_URL).header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON).body(payload).retrieve().toBodilessEntity();
            return response.getStatusCode().is2xxSuccessful()
                ? new DeliveryResult(true, response.getHeaders().getFirst("X-Message-Id"), null)
                : DeliveryResult.failure("EMAIL_PROVIDER_REJECTED");
        } catch (RestClientResponseException failure) {
            return DeliveryResult.failure("EMAIL_PROVIDER_HTTP_" + failure.getStatusCode().value());
        } catch (RestClientException failure) {
            return DeliveryResult.failure("EMAIL_PROVIDER_UNAVAILABLE");
        }
    }

    private DeliveryResult smtp(PaymentRequestReminderRepository.Dispatch dispatch, String body) {
        var sender = boundedSender(mailSenders.getIfAvailable());
        if (sender == null) return DeliveryResult.failure("EMAIL_PROVIDER_NOT_CONFIGURED");
        try {
            var message = new SimpleMailMessage();
            message.setFrom(from);
            if (!replyTo.isBlank()) message.setReplyTo(replyTo);
            message.setTo(dispatch.owner().email());
            message.setSubject(SUBJECT);
            message.setText(body);
            sender.send(message);
            return new DeliveryResult(true, dispatch.deliveryKey(), null);
        } catch (MailException failure) {
            return DeliveryResult.failure("EMAIL_PROVIDER_UNAVAILABLE");
        }
    }

    private String billingUrl() {
        try {
            var uri = URI.create(publicUrl);
            var loopback = List.of("localhost", "127.0.0.1", "[::1]", "::1").contains(clean(uri.getHost()));
            if (uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
                || !("https".equals(uri.getScheme()) || (loopback && "http".equals(uri.getScheme())))) return null;
            return uri.resolve("/billing").toString();
        } catch (IllegalArgumentException failure) {
            return null;
        }
    }

    private static RestClient boundedClient() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(10_000);
        return RestClient.builder().requestFactory(factory).build();
    }

    private JavaMailSender boundedSender(JavaMailSender configured) {
        if (!(configured instanceof JavaMailSenderImpl source)) return configured;
        var sender = new JavaMailSenderImpl();
        sender.setHost(source.getHost());
        sender.setPort(source.getPort());
        sender.setProtocol(source.getProtocol());
        sender.setUsername(source.getUsername());
        sender.setPassword(source.getPassword());
        sender.setDefaultEncoding(source.getDefaultEncoding());
        var settings = new Properties();
        settings.putAll(source.getSession().getProperties());
        for (var protocol : List.of("smtp", "smtps")) {
            settings.setProperty("mail." + protocol + ".connectiontimeout", "5000");
            settings.setProperty("mail." + protocol + ".timeout", "10000");
            settings.setProperty("mail." + protocol + ".writetimeout", "10000");
        }
        sender.setJavaMailProperties(settings);
        return sender;
    }

    private String clean(String value) { return value == null ? "" : value.trim(); }

    public record DeliveryResult(boolean sent, String providerReference, String errorCode) {
        public static DeliveryResult failure(String code) { return new DeliveryResult(false, null, code); }
    }
}
