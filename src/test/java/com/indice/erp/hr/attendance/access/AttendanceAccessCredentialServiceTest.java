package com.indice.erp.hr.attendance.access;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.indice.erp.hr.attendance.kiosk.AttendanceKioskTokenService;
import com.indice.erp.hr.attendance.models.AccessMethodRow;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class AttendanceAccessCredentialServiceTest {

    @Test
    void pinHashRemainsValidWhenCredentialReferenceWasCreatedWithAnOlderKey() {
        var encoder = new BCryptPasswordEncoder();
        var service = new AttendanceAccessCredentialService(
            mock(AttendanceAccessRepository.class),
            mock(AttendanceKioskTokenService.class),
            encoder
        );
        var method = new AccessMethodRow(
            11L, 7L, 13L, "pin", "pin:v1:stale-reference",
            encoder.encode("31415"), "active", 100, "{}", 17L, "E-17", "Employee"
        );

        assertThat(service.matchesPin(7L, "31415", method)).isTrue();
        assertThat(service.matchesPin(7L, "92653", method)).isFalse();
    }
}
