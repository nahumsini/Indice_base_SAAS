package com.indice.erp.hr.attendance.usecases.locations;

import com.indice.erp.hr.attendance.models.LocationRow;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AttendanceLocationResolutionTest {
    private final Resolver resolver = new Resolver();

    @Test
    void acceptsAnAllowedSiteWhoseRadiusContainsTheDeviceEvenIfAnotherCenterIsCloser() {
        // About 111m from a 50m site, but inside a second site's 300m radius.
        var small = site(1, "0.001", 50);
        var covering = site(2, "0.002", 300);
        assertThat(resolver.resolve(List.of(small, covering), null)).isEqualTo(covering);
    }

    @Test
    void stillUsesTheClosestSiteWhenBothRadiiContainTheDevice() {
        var near = site(1, "0.001", 200);
        var far = site(2, "0.002", 300);
        assertThat(resolver.resolve(List.of(far, near), null)).isEqualTo(near);
    }

    @Test
    void explicitLocationMustBeAuthorizedAndCannotFallBackToAnotherSitesRadius() {
        var small = site(1, "0.001", 50);
        var covering = site(2, "0.002", 300);
        assertThatThrownBy(() -> resolver.resolve(List.of(small, covering), 1L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("The device is outside the allowed attendance location radius.");
        assertThatThrownBy(() -> resolver.resolve(List.of(small, covering), 99L))
            .isInstanceOf(IllegalArgumentException.class).hasMessage("Restricted site.");
    }

    @Test
    void missingLocationsAndOutsideAllRadiiRemainRejected() {
        assertThatThrownBy(() -> resolver.resolve(List.of(), null))
            .isInstanceOf(IllegalArgumentException.class).hasMessage("No sites configured.");
        assertThatThrownBy(() -> resolver.resolve(List.of(site(1, "0.001", 50)), null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("The device is outside the allowed attendance location radius.");
    }

    private LocationRow site(long id, String latitude, int radius) {
        return new LocationRow(id, null, "", null, "", LocalDate.now(),
            LocalDate.now().plusYears(1), "Synthetic site", new BigDecimal(latitude),
            BigDecimal.ZERO, radius, new BigDecimal("8"), LocalTime.of(8, 0),
            LocalTime.of(16, 0), 5, "active", 0, "");
    }

    private static class Resolver extends HrAttendanceLocationResolverSupport {
        Resolver() { super(new AttendanceDependencies(null, null, null, null, null, null,
            null, null, null, null, null, null, null, null, null, null, null, null, false, 60)); }
        LocationRow resolve(List<LocationRow> allowed, Long requestedId) {
            return resolveAllowedAttendanceLocation(allowed, requestedId,
                BigDecimal.ZERO, BigDecimal.ZERO, "No sites configured.", "Restricted site.");
        }
    }
}
