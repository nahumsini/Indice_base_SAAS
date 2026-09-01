package com.indice.erp.consulting;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigInteger;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class ConsultingAppointmentServiceTest {

    @Test
    void generatedIdAcceptsTheBigIntegerReturnedByMysql() {
        assertEquals(42L, ConsultingAppointmentService.generatedId(BigInteger.valueOf(42L)));
    }

    @Test
    void generatedIdRejectsAMissingDatabaseKey() {
        assertThrows(
            IllegalStateException.class,
            () -> ConsultingAppointmentService.generatedId(null)
        );
    }

    @Test
    void consultationMonthUsesTheAppointmentsLocalCalendarMonth() {
        var period = ConsultingAppointmentService.consultationMonth(
            Instant.parse("2026-09-01T03:30:00Z"),
            ZoneId.of("America/Toronto")
        );

        assertEquals(Instant.parse("2026-08-01T04:00:00Z"), period.startsAt());
        assertEquals(Instant.parse("2026-09-01T04:00:00Z"), period.endsAt());
    }
}
