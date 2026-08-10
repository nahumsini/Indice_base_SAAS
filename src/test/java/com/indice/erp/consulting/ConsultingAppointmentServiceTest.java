package com.indice.erp.consulting;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigInteger;
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
}
