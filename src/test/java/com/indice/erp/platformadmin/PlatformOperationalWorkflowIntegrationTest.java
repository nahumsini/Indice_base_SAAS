package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThat;

import com.indice.erp.consulting.ConsultingAdministrationService;
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
    "app.entitlements.projection-enabled=false"
})
class PlatformOperationalWorkflowIntegrationTest {

    private static final String EMAIL_PREFIX = "operational-workflow-";
    private static final String WORK_ORDER_PREFIX = "Operational workflow ";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformModuleWorkOrderService workOrders;

    @Autowired
    private ConsultingAdministrationService consulting;

    private long actorUserId;
    private String consultantEmail;

    @BeforeEach
    void setUp() {
        cleanTestState();
        var discriminator = UUID.randomUUID().toString();
        consultantEmail = EMAIL_PREFIX + "consultant-" + discriminator + "@example.com";
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

        var cancelled = workOrders.cancel(actorUserId, ((Number) createdOrder.get("id")).longValue());
        assertThat(cancelled)
            .containsEntry("status", "CANCELLED")
            .containsEntry("removed", true);
    }

    private void cleanTestState() {
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
        jdbc.update("DELETE FROM users WHERE email LIKE ?", EMAIL_PREFIX + "%");
    }
}
