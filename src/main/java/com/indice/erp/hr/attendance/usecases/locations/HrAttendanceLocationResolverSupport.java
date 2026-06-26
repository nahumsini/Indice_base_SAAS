package com.indice.erp.hr.attendance.usecases.locations;

import com.indice.erp.hr.attendance.models.AttendanceHrUser;
import com.indice.erp.hr.attendance.models.LocationRow;
import com.indice.erp.hr.attendance.models.ScheduleRule;
import com.indice.erp.hr.attendance.models.WorkSiteAssignmentRow;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.isOpenSchedule;
import static com.indice.erp.hr.attendance.support.AttendanceGeo.distanceMeters;


public abstract class HrAttendanceLocationResolverSupport extends HrAttendanceLocationRepositorySupport {

    protected HrAttendanceLocationResolverSupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected LocationRow resolveScheduleRegistrationLocation(
        long companyId,
        AttendanceHrUser user,
        ScheduleRule scheduleRule,
        String eventType,
        Long requestedLocationId,
        BigDecimal latitude,
        BigDecimal longitude,
        WorkSiteAssignmentRow activeWorkSite
    ) {
        if (!List.of("check_in", "check_out", "break_out", "break_in").contains(eventType)) {
            return resolveKioskLocation(companyId, requestedLocationId, latitude, longitude);
        }

        if (activeWorkSite != null) {
            return resolveAllowedAttendanceLocation(
                List.of(activeWorkSite.location()),
                requestedLocationId,
                latitude,
                longitude,
                "Attendance registration is restricted to today's assigned contract site: " + activeWorkSite.location().name() + ".",
                "Attendance registration is restricted to today's assigned contract site: " + activeWorkSite.location().name() + "."
            );
        }

        if (isOpenSchedule(scheduleRule)) {
            if (!(scheduleRule.enforceLocation() && scheduleRule.locationId() != null)) {
                return requestedLocationId == null
                    ? null
                    : resolveKioskLocation(companyId, requestedLocationId, latitude, longitude);
            }
            return resolveAllowedAttendanceLocation(
                List.of(loadLocation(companyId, scheduleRule.locationId())),
                requestedLocationId,
                latitude,
                longitude,
                "Schedule location is not configured.",
                "Attendance registration is restricted to the configured schedule location."
            );
        }

        if (scheduleRule != null && scheduleRule.enforceLocation() && scheduleRule.locationId() != null) {
            return resolveAllowedAttendanceLocation(
                List.of(loadLocation(companyId, scheduleRule.locationId())),
                requestedLocationId,
                latitude,
                longitude,
                "Schedule location is not configured.",
                "Attendance registration is restricted to the configured schedule location."
            );
        }

        return resolveHrUserBusinessAttendanceLocation(companyId, user, requestedLocationId, latitude, longitude);
    }

    protected LocationRow resolveHrUserBusinessAttendanceLocation(
        long companyId,
        AttendanceHrUser user,
        Long requestedLocationId,
        BigDecimal latitude,
        BigDecimal longitude
    ) {
        if (user.businessId() == null) {
            throw new IllegalArgumentException("User business is not assigned. Set the user business before recording attendance.");
        }

        return resolveAllowedAttendanceLocation(
            loadBusinessStructureAttendanceLocations(companyId, user.businessId()),
            requestedLocationId,
            latitude,
            longitude,
            "Business Structure location is not configured for " + user.businessName() + ".",
            "Attendance registration is restricted to the user's assigned business location."
        );
    }

    protected LocationRow resolveUserAttendanceLocation(
        long companyId,
        Long requestedLocationId,
        BigDecimal latitude,
        BigDecimal longitude
    ) {
        return resolveAllowedAttendanceLocation(
            loadUserAttendanceLocations(companyId),
            requestedLocationId,
            latitude,
            longitude,
            "Attendance locations are not configured for this company.",
            "Attendance registration is restricted to active company locations."
        );
    }

    protected LocationRow resolveAllowedAttendanceLocation(
        List<LocationRow> allowedLocations,
        Long requestedLocationId,
        BigDecimal latitude,
        BigDecimal longitude,
        String emptyMessage,
        String restrictedMessage
    ) {
        if (allowedLocations.isEmpty()) {
            throw new IllegalArgumentException(emptyMessage);
        }

        LocationRow location;
        if (requestedLocationId != null && requestedLocationId > 0) {
            location = allowedLocations.stream()
                .filter(item -> Objects.equals(item.id(), requestedLocationId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(restrictedMessage));
        } else {
            location = allowedLocations.stream()
                .min(Comparator.comparing(item -> distanceMeters(item.latitude(), item.longitude(), latitude, longitude)))
                .orElseThrow(() -> new IllegalArgumentException(emptyMessage));
        }

        validateLocationRadius(location, latitude, longitude);
        return location;
    }

    protected void validateLocationRadius(LocationRow location, BigDecimal latitude, BigDecimal longitude) {
        var distance = distanceMeters(location.latitude(), location.longitude(), latitude, longitude);
        if (distance > location.radiusMeters()) {
            throw new IllegalArgumentException("The device is outside the allowed attendance location radius.");
        }
    }
}
