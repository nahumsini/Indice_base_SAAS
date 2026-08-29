package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.indice.erp.consulting.ConsultingAdministrationService;
import java.time.Instant;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
    "app.entitlements.enforcement-enabled=false",
    "app.entitlements.projection-enabled=false",
    "app.email.enabled=false"
})
class PlatformOperationalWorkflowIntegrationTest {

    private static final String EMAIL_PREFIX = "operational-workflow-";
    private static final String WORK_ORDER_PREFIX = "Operational workflow ";
    private static final String DISTRIBUTOR_PREFIX = "Operational distributor ";
    private static final String CLIENT_PREFIX = "Operational client ";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformModuleWorkOrderService workOrders;

    @Autowired
    private ConsultingAdministrationService consulting;

    private long actorUserId;
    private String consultantEmail;
    private String distributorEmail;
    private String distributorCompanyName;

    @BeforeEach
    void setUp() {
        cleanTestState();
        var discriminator = UUID.randomUUID().toString();
        consultantEmail = EMAIL_PREFIX + "consultant-" + discriminator + "@example.com";
        distributorEmail = EMAIL_PREFIX + "distributor-" + discriminator + "@example.com";
        distributorCompanyName = DISTRIBUTOR_PREFIX + discriminator;
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$workflowtest', 'Operational Root Test')",
            EMAIL_PREFIX + discriminator + "@example.com"
        );
        actorUserId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO platform_administrators (user_id, platform_role, status, mfa_required, created_by_user_id) VALUES (?, 'PLATFORM_ROOT', 'ACTIVE', 0, ?)",
            actorUserId,
            actorUserId
        );
        jdbc.update(
            "INSERT INTO companies (name, commercial_account_type) VALUES (?, 'DISTRIBUTOR')",
            distributorCompanyName
        );
        var distributorCompanyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$workflowtest', 'Daniel Distribuidor')",
            distributorEmail
        );
        var distributorUserId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, 'superadmin', 'active', 'all')",
            distributorUserId,
            distributorCompanyId
        );
        jdbc.update(
            "INSERT INTO user_profiles (user_id, full_name, phone) VALUES (?, 'Daniel Distribuidor', '+52 81 5555 0202')",
            distributorUserId
        );
    }

    @AfterEach
    void clean() {
        cleanTestState();
    }

    @Test
    void workOrdersAndConsultantsPersistAndRemainAvailableAfterCreation() {
        var moduleName = WORK_ORDER_PREFIX + UUID.randomUUID();
        var createdOrder = workOrders.create(
            actorUserId,
            new PlatformModuleWorkOrderService.CreateRequest(moduleName, "es-MX")
        );
        assertThat(createdOrder)
            .containsEntry("moduleName", moduleName)
            .containsEntry("sourceLocale", "es-MX")
            .containsEntry("status", "DRAFT");

        @SuppressWarnings("unchecked")
        var persistedOrders = (List<Map<String, Object>>) workOrders.list(actorUserId).get("work_orders");
        assertThat(persistedOrders).anyMatch(row -> createdOrder.get("id").equals(row.get("id")));

        var consultant = consulting.createConsultant(
            actorUserId,
            new ConsultingAdministrationService.ConsultantCreateRequest(
                "Andrea", "Operaciones", "+52 81 5555 0101", consultantEmail
            )
        );
        assertThat(consultant)
            .containsEntry("firstName", "Andrea")
            .containsEntry("lastName", "Operaciones")
            .containsEntry("email", consultantEmail)
            .containsEntry("active", true);

        @SuppressWarnings("unchecked")
        var consultants = (List<Map<String, Object>>) consulting.workspace(actorUserId).get("consultants");
        assertThat(consultants).anyMatch(row -> consultantEmail.equals(row.get("email")));
        assertThat(consultants).anyMatch(row ->
            distributorEmail.equals(row.get("email"))
                && "DISTRIBUTOR".equals(row.get("sourceType"))
                && distributorCompanyName.equals(row.get("companyName"))
        );

        var cancelled = workOrders.cancel(actorUserId, ((Number) createdOrder.get("id")).longValue());
        assertThat(cancelled)
            .containsEntry("status", "CANCELLED")
            .containsEntry("removed", true);
    }

    @Test
    void consultationTypeControlsTheFixedUsdPriceAndSessionKind() {
        var clientName = CLIENT_PREFIX + UUID.randomUUID();
        jdbc.update(
            "INSERT INTO companies (name, commercial_account_type) VALUES (?, 'SUPER_ADMIN')",
            clientName
        );
        var clientCompanyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        var startAt = Instant.now().plusSeconds(86_400);
        var created = consulting.createAppointment(
            actorUserId,
            new ConsultingAdministrationService.AdminAppointmentCreateRequest(
                clientCompanyId,
                "Cliente de prueba",
                EMAIL_PREFIX + "client@example.com",
                "+52 81 5555 0303",
                "BUSINESS_CONSULTING",
                "VIRTUAL",
                startAt.toString(),
                "America/Mexico_City",
                60,
                "Andrea Operaciones",
                consultantEmail,
                "+52 81 5555 0101",
                "https://meet.example.com/indice-test",
                null,
                null,
                "MX"
            )
        );
        var appointmentId = ((Number) created.get("id")).longValue();

        var paid = consulting.updateAppointment(
            actorUserId,
            appointmentId,
            appointmentUpdate(startAt, "PENDING", 12_345L, "MXN")
        );
        assertThat(paid)
            .containsEntry("session_kind", "ADDITIONAL")
            .containsEntry("payment_status", "PENDING")
            .containsEntry("amount_cents", 7_900L)
            .containsEntry("currency", "USD")
            .containsEntry("notification_status", "DISABLED");

        var courtesy = consulting.updateAppointment(
            actorUserId,
            appointmentId,
            appointmentUpdate(startAt, "WAIVED", 7_900L, "CAD")
        );
        assertThat(courtesy)
            .containsEntry("session_kind", "ADDITIONAL")
            .containsEntry("payment_status", "WAIVED")
            .containsEntry("amount_cents", 0L)
            .containsEntry("currency", "USD");

        var implementation = consulting.updateAppointment(
            actorUserId,
            appointmentId,
            appointmentUpdate(startAt, "INCLUDED", 7_900L, "CAD")
        );
        assertThat(implementation)
            .containsEntry("session_kind", "INCLUDED")
            .containsEntry("payment_status", "INCLUDED")
            .containsEntry("amount_cents", 0L)
            .containsEntry("currency", "USD");
    }

    @Test
    void consultantAvailabilityPersistsForTheSharedCalendar() {
        var initial = consulting.consultantAvailability(actorUserId, distributorEmail);
        assertThat(initial)
            .containsEntry("consultantEmail", distributorEmail)
            .containsEntry("configured", false);

        var saved = consulting.updateConsultantAvailability(
            actorUserId,
            new ConsultingAdministrationService.AvailabilityUpdateRequest(
                distributorEmail,
                "America/Monterrey",
                List.of(
                    new ConsultingAdministrationService.AvailabilityDayRequest(1, true, "09:00", "17:00"),
                    new ConsultingAdministrationService.AvailabilityDayRequest(2, true, "09:00", "17:00"),
                    new ConsultingAdministrationService.AvailabilityDayRequest(3, true, "09:00", "17:00"),
                    new ConsultingAdministrationService.AvailabilityDayRequest(4, true, "09:00", "17:00"),
                    new ConsultingAdministrationService.AvailabilityDayRequest(5, true, "09:00", "17:00"),
                    new ConsultingAdministrationService.AvailabilityDayRequest(6, false, "", ""),
                    new ConsultingAdministrationService.AvailabilityDayRequest(7, false, "", "")
                )
            )
        );

        assertThat(saved)
            .containsEntry("consultantEmail", distributorEmail)
            .containsEntry("timezone", "America/Monterrey")
            .containsEntry("configured", true);
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM consulting_consultant_availability WHERE consultant_email = ?",
            Integer.class,
            distributorEmail
        )).isEqualTo(7);

        var clientName = CLIENT_PREFIX + UUID.randomUUID();
        jdbc.update(
            "INSERT INTO companies (name, commercial_account_type) VALUES (?, 'SUPER_ADMIN')",
            clientName
        );
        var clientCompanyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        var availabilityZone = ZoneId.of("America/Monterrey");
        var validStart = LocalDate.now(availabilityZone)
            .with(TemporalAdjusters.next(DayOfWeek.MONDAY))
            .atTime(10, 0)
            .atZone(availabilityZone)
            .toInstant();

        var created = consulting.createAppointment(
            actorUserId,
            availabilityAppointment(clientCompanyId, validStart)
        );
        assertThat(created).containsEntry("status", "CONFIRMED");
        assertThatThrownBy(() -> consulting.createAppointment(
            actorUserId,
            availabilityAppointment(clientCompanyId, validStart)
        )).hasMessageContaining("ya tiene una consultoría");
    }

    private ConsultingAdministrationService.AdminAppointmentCreateRequest availabilityAppointment(
        long clientCompanyId,
        Instant startAt
    ) {
        return new ConsultingAdministrationService.AdminAppointmentCreateRequest(
            clientCompanyId,
            "Cliente disponibilidad",
            EMAIL_PREFIX + "availability-client@example.com",
            "+52 81 5555 0404",
            "BUSINESS_CONSULTING",
            "VIRTUAL",
            startAt.toString(),
            "America/Monterrey",
            60,
            "Daniel Distribuidor",
            distributorEmail,
            "+52 81 5555 0202",
            "https://meet.example.com/availability",
            null,
            null,
            "MX"
        );
    }

    private ConsultingAdministrationService.AppointmentUpdateRequest appointmentUpdate(
        Instant startAt,
        String paymentStatus,
        Long amountCents,
        String currency
    ) {
        return new ConsultingAdministrationService.AppointmentUpdateRequest(
            "CONFIRMED",
            startAt.toString(),
            "https://meet.example.com/indice-test",
            "Andrea Operaciones",
            consultantEmail,
            "+52 81 5555 0101",
            "Validación de tarifa fija",
            paymentStatus,
            amountCents,
            currency,
            ""
        );
    }

    private void cleanTestState() {
        jdbc.update(
            "DELETE FROM consulting_consultant_availability WHERE consultant_email LIKE ?",
            EMAIL_PREFIX + "%"
        );
        jdbc.update(
            "DELETE FROM platform_audit_events WHERE actor_user_id IN (SELECT id FROM users WHERE email LIKE ?)",
            EMAIL_PREFIX + "%"
        );
        jdbc.update("DELETE FROM consulting_consultants WHERE email LIKE ?", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM platform_module_work_orders WHERE module_name LIKE ?", WORK_ORDER_PREFIX + "%");
        jdbc.update(
            "DELETE FROM platform_administrators WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)",
            EMAIL_PREFIX + "%"
        );
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", DISTRIBUTOR_PREFIX + "%");
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", CLIENT_PREFIX + "%");
        jdbc.update("DELETE FROM users WHERE email LIKE ?", EMAIL_PREFIX + "%");
    }
}
