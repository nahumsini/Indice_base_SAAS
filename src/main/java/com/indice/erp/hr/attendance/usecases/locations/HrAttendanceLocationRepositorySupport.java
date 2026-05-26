package com.indice.erp.hr.attendance.usecases.locations;

import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.attendance.kiosk.KioskDeviceRow;
import com.indice.erp.hr.attendance.models.LocationRow;
import com.indice.erp.hr.attendance.models.WorkSiteAssignmentRow;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import com.indice.erp.hr.attendance.usecases.support.HrAttendanceJsonSupport;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import static com.indice.erp.hr.attendance.support.AttendanceGeo.distanceMeters;
import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


public abstract class HrAttendanceLocationRepositorySupport extends HrAttendanceJsonSupport {

    protected HrAttendanceLocationRepositorySupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected List<LocationRow> listLocations(long companyId) {
        return attendanceLocationRepository.listLocations(companyId);
    }

    protected List<LocationRow> listLocations(long companyId, HrOperationalScope scope) {
        return attendanceLocationRepository.listLocations(companyId, scope);
    }

    protected Map<Long, List<LocationRow>> groupLocationsByBusiness(List<LocationRow> locations) {
        return attendanceLocationRepository.groupLocationsByBusiness(locations);
    }

    protected List<LocationRow> loadLocationRows(long companyId, boolean activeOnly) {
        return attendanceLocationRepository.loadLocationRows(companyId, activeOnly);
    }

    protected List<LocationRow> loadLocationRows(long companyId, boolean activeOnly, HrOperationalScope scope) {
        return attendanceLocationRepository.loadLocationRows(companyId, activeOnly, scope);
    }

    protected LocationRow loadLocation(long companyId, Long locationId) {
        return attendanceLocationRepository.loadLocation(companyId, locationId);
    }

    protected List<LocationRow> loadBusinessAttendanceLocations(long companyId, Long businessId) {
        return attendanceLocationRepository.loadBusinessAttendanceLocations(companyId, businessId);
    }

    protected List<LocationRow> loadCompanyBusinessStructureAttendanceLocations(long companyId) {
        return attendanceLocationRepository.loadCompanyBusinessStructureAttendanceLocations(companyId);
    }

    protected List<LocationRow> loadUserAttendanceLocations(long companyId) {
        return attendanceLocationRepository.loadUserAttendanceLocations(companyId);
    }

    protected List<LocationRow> loadBusinessStructureAttendanceLocations(long companyId, Long businessId) {
        return attendanceLocationRepository.loadBusinessStructureAttendanceLocations(companyId, businessId);
    }

    protected List<LocationRow> loadAllowedLocations(long companyId, long userCompanyId) {
        return attendanceAllowedLocationRepository.loadAllowedLocations(companyId, userCompanyId);
    }

    protected Map<Long, List<LocationRow>> loadAllowedLocationsByUser(long companyId) {
        return attendanceAllowedLocationRepository.loadAllowedLocationsByUser(companyId);
    }

    protected Map<Long, List<LocationRow>> loadAllowedLocationsByUser(long companyId, HrOperationalScope scope) {
        return attendanceAllowedLocationRepository.loadAllowedLocationsByUser(companyId, scope);
    }

    protected void ensureHrUserAllowedLocation(long companyId, long userId, long userCompanyId, long locationId) {
        attendanceAllowedLocationRepository.ensureHrUserAllowedLocation(companyId, userId, userCompanyId, locationId);
    }

    protected long insertWorkSiteAssignment(
        long companyId,
        long userId,
        long userCompanyId,
        long locationId,
        LocalDate effectiveStartDate,
        LocalDate effectiveEndDate
    ) {
        return attendanceWorkSiteAssignmentRepository.insertWorkSiteAssignment(
            companyId,
            userId,
            userCompanyId,
            locationId,
            effectiveStartDate,
            effectiveEndDate
        );
    }

    protected Map<Long, WorkSiteAssignmentRow> loadActiveWorkSiteAssignments(long companyId, LocalDate date) {
        return attendanceWorkSiteAssignmentRepository.loadActiveWorkSiteAssignments(companyId, date);
    }

    protected Map<Long, WorkSiteAssignmentRow> loadActiveWorkSiteAssignments(
        long companyId,
        LocalDate date,
        HrOperationalScope scope
    ) {
        return attendanceWorkSiteAssignmentRepository.loadActiveWorkSiteAssignments(companyId, date, scope);
    }

    protected WorkSiteAssignmentRow loadActiveWorkSiteAssignment(long companyId, long userCompanyId, LocalDate date) {
        return attendanceWorkSiteAssignmentRepository.loadActiveWorkSiteAssignment(companyId, userCompanyId, date);
    }

    protected Map<LocalDate, WorkSiteAssignmentRow> loadActiveWorkSiteAssignments(
        long companyId,
        long userCompanyId,
        LocalDate startDate,
        LocalDate endDate
    ) {
        return attendanceWorkSiteAssignmentRepository.loadActiveWorkSiteAssignments(
            companyId,
            userCompanyId,
            startDate,
            endDate
        );
    }

    protected LocationRow resolveKioskLocation(long companyId, Long locationId, BigDecimal latitude, BigDecimal longitude) {
        var locations = listLocations(companyId);
        if (locations.isEmpty()) {
            throw new IllegalArgumentException("No active attendance locations are configured.");
        }

        LocationRow location;
        if (locationId != null && locationId > 0) {
            location = locations.stream()
                .filter(item -> item.id() == locationId)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Attendance location not found."));
        } else {
            location = locations.stream()
                .min(Comparator.comparing(item -> distanceMeters(item.latitude(), item.longitude(), latitude, longitude)))
                .orElseThrow(() -> new IllegalArgumentException("Attendance location not found."));
        }

        var distance = distanceMeters(location.latitude(), location.longitude(), latitude, longitude);
        if (enforceLocationRadius && distance > location.radiusMeters()) {
            throw new IllegalArgumentException("The device is outside the allowed attendance location radius.");
        }

        return location;
    }

    protected LocationRow mapLocation(ResultSet rs, String prefix) throws SQLException {
        var id = getNullableLong(rs, prefix + "_id");
        if (id == null) {
            return null;
        }
        return new LocationRow(
            id,
            null,
            "",
            null,
            "",
            null,
            null,
            safe(rs.getString(prefix + "_name")),
            rs.getBigDecimal(prefix + "_latitude"),
            rs.getBigDecimal(prefix + "_longitude"),
            rs.getInt(prefix + "_radius_meters"),
            null,
            null,
            null,
            null,
            "active",
            0,
            ""
        );
    }

    protected LocationRow requirePublicKioskLocation(KioskDeviceRow kioskDevice) {
        if (kioskDevice.locationId() == null) {
            throw new IllegalArgumentException("Kiosk device is not linked to an attendance location.");
        }

        return loadLocation(kioskDevice.companyId(), kioskDevice.locationId());
    }

    protected LocationRow loadPublicKioskLocation(KioskDeviceRow kioskDevice) {
        return kioskDevice.locationId() == null ? null : loadLocation(kioskDevice.companyId(), kioskDevice.locationId());
    }
}
