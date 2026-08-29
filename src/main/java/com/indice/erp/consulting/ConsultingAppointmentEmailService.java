package com.indice.erp.consulting;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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
class ConsultingAppointmentEmailService {

    private static final Logger log = LoggerFactory.getLogger(ConsultingAppointmentEmailService.class);
    private static final String SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final RestClient restClient;
    private final boolean enabled;
    private final String provider;
    private final String fromAddress;
    private final String fromName;
    private final String sendgridApiKey;
    private final String teamEmail;

    ConsultingAppointmentEmailService(
        ObjectProvider<JavaMailSender> mailSenderProvider,
        RestClient.Builder restClientBuilder,
        @Value("${app.email.enabled:true}") boolean enabled,
        @Value("${app.email.provider:sendgrid}") String provider,
        @Value("${app.email.from:no-reply@indice.local}") String fromAddress,
        @Value("${app.email.from-name:Indice ERP}") String fromName,
        @Value("${app.email.sendgrid.api-key:}") String sendgridApiKey,
        @Value("${app.consulting.team-email:consultoria@indiceapp.com}") String teamEmail
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.restClient = restClientBuilder.build();
        this.enabled = enabled;
        this.provider = clean(provider, "smtp").toLowerCase();
        this.fromAddress = clean(fromAddress, "");
        this.fromName = clean(fromName, "Indice");
        this.sendgridApiKey = clean(sendgridApiKey, "");
        this.teamEmail = clean(teamEmail, "");
    }

    DeliveryResult sendBookingRequest(BookingEmail booking) {
        if (!enabled) {
            return new DeliveryResult("DISABLED", "Email delivery is disabled.");
        }
        if (teamEmail.isBlank()) {
            return new DeliveryResult("FAILED", "Consulting team email is not configured.");
        }

        try {
            var subject = "Nueva solicitud de consultoría · " + booking.companyName();
            send(teamEmail, booking.attendeeEmail(), subject, teamBody(booking));
            send(
                booking.attendeeEmail(),
                teamEmail,
                "Recibimos tu solicitud de consultoría",
                attendeeBody(booking)
            );
            return new DeliveryResult("SENT", "Booking notifications sent.");
        } catch (RuntimeException exception) {
            log.warn("Unable to send consulting appointment notifications for appointment {}", booking.appointmentId(), exception);
            return new DeliveryResult("FAILED", "Booking was saved, but email delivery failed.");
        }
    }

    DeliveryResult sendStatusUpdate(StatusEmail update) {
        if (!enabled) {
            return new DeliveryResult("DISABLED", "Email delivery is disabled.");
        }
        try {
            send(
                update.attendeeEmail(),
                teamEmail,
                statusSubject(update),
                statusBody(update)
            );
            return new DeliveryResult("SENT", "Status notification sent.");
        } catch (RuntimeException exception) {
            log.warn("Unable to send consulting status notification for appointment {}", update.appointmentId(), exception);
            return new DeliveryResult("FAILED", "The appointment was updated, but email delivery failed.");
        }
    }

    private void send(String recipient, String replyTo, String subject, String body) {
        if ("sendgrid".equals(provider)) {
            sendWithSendGrid(recipient, replyTo, subject, body);
            return;
        }
        if (!provider.isBlank() && !"smtp".equals(provider)) {
            throw new IllegalStateException("Unsupported email provider: " + provider);
        }
        sendWithSmtp(recipient, replyTo, subject, body);
    }

    private void sendWithSmtp(String recipient, String replyTo, String subject, String body) {
        var mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            throw new IllegalStateException("Mail sender is not configured.");
        }
        var message = new SimpleMailMessage();
        if (!fromAddress.isBlank()) {
            message.setFrom(fromAddress);
        }
        if (!replyTo.isBlank()) {
            message.setReplyTo(replyTo);
        }
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }

    private void sendWithSendGrid(String recipient, String replyTo, String subject, String body) {
        if (sendgridApiKey.isBlank() || fromAddress.isBlank()) {
            throw new IllegalStateException("SendGrid API key or from address is not configured.");
        }
        var from = new LinkedHashMap<String, Object>();
        from.put("email", fromAddress);
        if (!fromName.isBlank()) {
            from.put("name", fromName);
        }
        var payload = new LinkedHashMap<String, Object>();
        payload.put("personalizations", List.of(Map.of(
            "to", List.of(Map.of("email", recipient)),
            "subject", subject
        )));
        payload.put("from", from);
        if (!replyTo.isBlank()) {
            payload.put("reply_to", Map.of("email", replyTo));
        }
        payload.put("content", List.of(Map.of("type", "text/plain", "value", body)));
        restClient.post()
            .uri(SENDGRID_URL)
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + sendgridApiKey)
            .contentType(MediaType.APPLICATION_JSON)
            .body(payload)
            .retrieve()
            .toBodilessEntity();
    }

    private String teamBody(BookingEmail booking) {
        return """
            Se registró una nueva solicitud de consultoría en Índice.

            Empresa: %s
            Persona: %s
            Correo: %s
            Teléfono: %s
            Tema: %s
            Modalidad: %s
            Ubicación: %s
            Sesión: %s
            Importe: %s
            Horario preferente: %s
            Horario alternativo: %s
            Zona horaria: %s
            Notas: %s

            Solicitud #%d. Confirma el horario directamente con la persona solicitante.
            """.formatted(
                booking.companyName(), booking.attendeeName(), booking.attendeeEmail(),
                optional(booking.attendeePhone()), booking.topic(), mode(booking.consultationMode()),
                location(booking), booking.sessionKind(),
                price(booking),
                booking.preferredStart(), optional(booking.alternativeStart()), booking.timezone(),
                optional(booking.notes()), booking.appointmentId()
            );
    }

    private String attendeeBody(BookingEmail booking) {
        var paymentNote = "ADDITIONAL".equals(booking.sessionKind())
            ? "Esta sesión adicional cuesta %s. El equipo te compartirá el enlace de pago antes de confirmarla."
                .formatted(price(booking))
            : "Esta sesión forma parte de la implementación incluida con tu cuenta.";
        return """
            Hola %s,

            Recibimos tu solicitud de consultoría para %s.

            Horario preferente: %s
            Horario alternativo: %s
            Zona horaria: %s
            Modalidad: %s
            Ubicación: %s

            %s

            El horario aún está pendiente de confirmación. El equipo de Índice te responderá por correo con la cita definitiva y el enlace de reunión.
            """.formatted(
                booking.attendeeName(), booking.companyName(), booking.preferredStart(),
                optional(booking.alternativeStart()), booking.timezone(),
                mode(booking.consultationMode()), location(booking), paymentNote
            );
    }

    private String statusSubject(StatusEmail update) {
        return switch (update.status()) {
            case "CONFIRMED" -> "Tu consultoría con Índice está confirmada";
            case "CANCELLED" -> "Actualización de tu solicitud de consultoría";
            case "COMPLETED" -> "Gracias por tu sesión de consultoría";
            default -> "Actualización de tu consultoría con Índice";
        };
    }

    private String statusBody(StatusEmail update) {
        var statusMessage = switch (update.status()) {
            case "CONFIRMED" -> "Tu solicitud fue confirmada. El enlace de acceso aparecerá en Índice 15 minutos antes de la sesión.";
            case "CANCELLED" -> "La solicitud fue cancelada. Puedes volver a solicitar una sesión desde tu Panel Inicial.";
            case "COMPLETED" -> "La sesión fue marcada como completada. Gracias por permitirnos acompañar el crecimiento de tu empresa.";
            default -> "Tu solicitud tuvo una actualización.";
        };
        return """
            Hola %s,

            %s

            Empresa: %s
            Fecha confirmada: %s
            Modalidad: %s
            Ubicación: %s
            Consultor: %s

            Si necesitas un cambio o no te sientes cómodo con tu consultor, responde este correo y con gusto asignaremos a otra persona para tu próxima sesión.
            """.formatted(
                update.attendeeName(), statusMessage, update.companyName(),
                optional(update.confirmedStart()), mode(update.consultationMode()),
                optional(update.locationName()), optional(update.consultantName())
            );
    }

    private String mode(String value) {
        return "IN_PERSON".equalsIgnoreCase(value) ? "Presencial" : "Virtual";
    }

    private String location(BookingEmail booking) {
        if (booking.locationName() == null || booking.locationName().isBlank()) {
            return optional(booking.countryName());
        }
        return booking.locationName() + (booking.countryName() == null ? "" : ", " + booking.countryName());
    }

    private String optional(String value) {
        return value == null || value.isBlank() ? "No indicado" : value.trim();
    }

    private String price(BookingEmail booking) {
        if (booking.amountCents() == null) {
            return "Incluida";
        }
        return String.format(
            Locale.US,
            "%s %,.2f",
            clean(booking.currency(), "USD").toUpperCase(Locale.ROOT),
            booking.amountCents() / 100.0
        );
    }

    private String clean(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    record DeliveryResult(String status, String message) {
    }

    record BookingEmail(
        long appointmentId,
        String companyName,
        String attendeeName,
        String attendeeEmail,
        String attendeePhone,
        String topic,
        String notes,
        String preferredStart,
        String alternativeStart,
        String timezone,
        String sessionKind,
        Long amountCents,
        String currency,
        String consultationMode,
        String locationName,
        String countryName
    ) {
    }

    record StatusEmail(
        long appointmentId,
        String companyName,
        String attendeeName,
        String attendeeEmail,
        String status,
        String confirmedStart,
        String consultationMode,
        String locationName,
        String consultantName
    ) {
    }
}
