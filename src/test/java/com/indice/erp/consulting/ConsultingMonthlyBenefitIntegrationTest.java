package com.indice.erp.consulting;

import static org.assertj.core.api.Assertions.assertThat;

import com.indice.erp.auth.AuthSessionUser;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = "app.email.enabled=false")
class ConsultingMonthlyBenefitIntegrationTest {

    private static final ZoneId TIMEZONE = ZoneId.of("America/Toronto");

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ConsultingAppointmentService service;

    private long companyId;
    private long userId;
    private AuthSessionUser user;

    @BeforeEach
    void setUp() {
        var discriminator = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", "consulting-monthly-" + discriminator);
        companyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$consultingtest', 'Consulting Owner')",
            "consulting-monthly-" + discriminator + "@example.com"
        );
        userId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        user = new AuthSessionUser(userId, companyId, "Consulting Owner", "owner");
        jdbc.update(
            """
                INSERT INTO company_billing_subscriptions (
                    stripe_subscription_id, company_id, billing_interval, status,
                    last_event_id, last_event_created_at
                ) VALUES (?, ?, 'MONTH', 'active', ?, CURRENT_TIMESTAMP(6))
                """,
            "sub_consulting_" + discriminator,
            companyId,
            "evt_consulting_" + discriminator
        );
    }

    @AfterEach
    void cleanUp() {
        if (companyId > 0) jdbc.update("DELETE FROM companies WHERE id = ?", companyId);
        if (userId > 0) jdbc.update("DELETE FROM users WHERE id = ?", userId);
    }

    @Test
    void grantsOneSixtyMinuteSessionPerAppointmentMonthAndReleasesCancelledCredit() {
        var firstMonth = businessDayInMonth(ZonedDateTime.now(TIMEZONE).plusMonths(1), 8);
        var secondTime = nextBusinessDay(firstMonth);
        var nextMonth = businessDayInMonth(firstMonth.plusMonths(1), 8);

        var included = create(firstMonth);
        var additional = create(secondTime);

        assertThat(included).containsEntry("session_kind", "INCLUDED")
            .containsEntry("duration_minutes", 60)
            .containsEntry("amount_cents", null);
        assertThat(additional).containsEntry("session_kind", "ADDITIONAL")
            .containsEntry("duration_minutes", 60)
            .containsEntry("amount_cents", 7_900L);

        service.cancel(user, ((Number) included.get("id")).longValue(), new ConsultingAppointmentService.CancelRequest("Reschedule"));
        assertThat(create(firstMonth.plusHours(2))).containsEntry("session_kind", "INCLUDED");
        assertThat(create(nextMonth)).containsEntry("session_kind", "INCLUDED");
    }

    @Test
    void chargesThePublishedRateWhenCommercialAccessIsNotActive() {
        jdbc.update(
            "UPDATE company_billing_subscriptions SET status = 'canceled' WHERE company_id = ?",
            companyId
        );
        var appointment = create(businessDayInMonth(ZonedDateTime.now(TIMEZONE).plusMonths(1), 8));

        assertThat(appointment).containsEntry("session_kind", "ADDITIONAL")
            .containsEntry("duration_minutes", 60)
            .containsEntry("amount_cents", 7_900L);
    }

    private Map<String, Object> create(ZonedDateTime preferred) {
        return service.create(user, new ConsultingAppointmentService.BookingRequest(
            "Consulting Owner",
            "owner@example.com",
            "+1 416 555 0100",
            "INDICE_TEAM",
            "OTHER",
            "Monthly benefit integration test",
            preferred.toInstant().toString(),
            null,
            TIMEZONE.getId(),
            "VIRTUAL",
            null,
            null
        ));
    }

    private ZonedDateTime businessDayInMonth(ZonedDateTime month, int day) {
        var date = LocalDate.of(month.getYear(), month.getMonth(), day);
        while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            date = date.plusDays(1);
        }
        return ZonedDateTime.of(date, LocalTime.of(10, 0), TIMEZONE);
    }

    private ZonedDateTime nextBusinessDay(ZonedDateTime value) {
        var next = value.plusDays(1);
        while (next.getDayOfWeek() == DayOfWeek.SATURDAY || next.getDayOfWeek() == DayOfWeek.SUNDAY) {
            next = next.plusDays(1);
        }
        return next;
    }
}
