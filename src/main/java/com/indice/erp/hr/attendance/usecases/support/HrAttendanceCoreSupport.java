package com.indice.erp.hr.attendance.usecases.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.face.HrFaceService;
import com.indice.erp.hr.attendance.access.AttendanceAccessService;
import com.indice.erp.hr.attendance.application.AttendancePhotoService;
import com.indice.erp.hr.attendance.assignment.AttendanceAssignmentService;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskDeviceMapper;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskDeviceRepository;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskDeviceService;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskPinThrottleService;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskTokenService;
import com.indice.erp.hr.attendance.locations.AttendanceAllowedLocationRepository;
import com.indice.erp.hr.attendance.locations.AttendanceLocationRepository;
import com.indice.erp.hr.attendance.locations.AttendanceWorkSiteAssignmentRepository;
import com.indice.erp.hr.attendance.models.AttendanceHrUser;
import com.indice.erp.hr.attendance.models.ScopeBusinessRow;
import com.indice.erp.hr.attendance.policy.AttendanceEditPolicy;
import com.indice.erp.hr.attendance.records.AttendanceDailyRecordRepository;
import com.indice.erp.hr.attendance.schedule.AttendanceScheduleCandidateService;
import com.indice.erp.hr.attendance.users.AttendanceUserLookupService;
import com.indice.erp.location.GoogleMapsCoordinateExtractor;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;


public abstract class HrAttendanceCoreSupport {

    protected final JdbcTemplate jdbcTemplate;
    protected final AttendanceAssignmentService attendanceAssignmentService;
    protected final AttendanceKioskTokenService attendanceKioskTokenService;
    protected final AttendanceKioskPinThrottleService attendanceKioskPinThrottleService;
    protected final AttendanceKioskDeviceRepository attendanceKioskDeviceRepository;
    protected final AttendanceKioskDeviceService attendanceKioskDeviceService;
    protected final AttendanceKioskDeviceMapper attendanceKioskDeviceMapper;
    protected final AttendanceLocationRepository attendanceLocationRepository;
    protected final AttendanceAllowedLocationRepository attendanceAllowedLocationRepository;
    protected final AttendanceWorkSiteAssignmentRepository attendanceWorkSiteAssignmentRepository;
    protected final AttendanceAccessService attendanceAccessService;
    protected final AttendanceUserLookupService attendanceUserLookupService;
    protected final AttendanceDailyRecordRepository attendanceDailyRecordRepository;
    protected final AttendanceScheduleCandidateService attendanceScheduleCandidateService;
    protected final AttendancePhotoService attendancePhotoService;
    protected final ObjectMapper objectMapper;
    protected final HrFaceService hrFaceService;
    protected final GoogleMapsCoordinateExtractor googleMapsCoordinateExtractor;
    protected final boolean enforceLocationRadius;
    protected final int kioskInactivityTimeoutSeconds;

    protected HrAttendanceCoreSupport(AttendanceDependencies dependencies) {
        this.jdbcTemplate = dependencies.jdbcTemplate();
        this.attendanceAssignmentService = dependencies.attendanceAssignmentService();
        this.attendanceKioskTokenService = dependencies.attendanceKioskTokenService();
        this.attendanceKioskPinThrottleService = dependencies.attendanceKioskPinThrottleService();
        this.attendanceKioskDeviceRepository = dependencies.attendanceKioskDeviceRepository();
        this.attendanceKioskDeviceService = dependencies.attendanceKioskDeviceService();
        this.attendanceKioskDeviceMapper = dependencies.attendanceKioskDeviceMapper();
        this.attendanceLocationRepository = dependencies.attendanceLocationRepository();
        this.attendanceAllowedLocationRepository = dependencies.attendanceAllowedLocationRepository();
        this.attendanceWorkSiteAssignmentRepository = dependencies.attendanceWorkSiteAssignmentRepository();
        this.attendanceAccessService = dependencies.attendanceAccessService();
        this.attendanceUserLookupService = dependencies.attendanceUserLookupService();
        this.attendanceDailyRecordRepository = dependencies.attendanceDailyRecordRepository();
        this.attendanceScheduleCandidateService = dependencies.attendanceScheduleCandidateService();
        this.attendancePhotoService = dependencies.attendancePhotoService();
        this.objectMapper = dependencies.objectMapper();
        this.hrFaceService = dependencies.hrFaceService();
        this.googleMapsCoordinateExtractor = dependencies.googleMapsCoordinateExtractor();
        this.enforceLocationRadius = dependencies.enforceLocationRadius();
        this.kioskInactivityTimeoutSeconds = Math.max(dependencies.kioskInactivityTimeoutSeconds(), 15);
    }

    protected void validateOperationalScope(long companyId, Long unitId, Long businessId, Long locationId) {
        if (unitId != null) {
            var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM units WHERE id = ? AND (company_id = ? OR company_id IS NULL)",
                Integer.class,
                unitId,
                companyId
            );
            if (count == null || count == 0) {
                throw new IllegalArgumentException("Selected unit does not exist.");
            }
        }

        if (businessId != null) {
            var rows = jdbcTemplate.query(
                """
                    SELECT id, unit_id
                    FROM businesses
                    WHERE id = ?
                      AND (company_id = ? OR company_id IS NULL)
                    LIMIT 1
                    """,
                (rs, rowNum) -> new ScopeBusinessRow(rs.getLong("id"), getNullableLong(rs, "unit_id")),
                businessId,
                companyId
            );
            if (rows.isEmpty()) {
                throw new IllegalArgumentException("Selected business does not exist.");
            }
            var business = rows.getFirst();
            if (unitId != null && business.unitId() != null && !unitId.equals(business.unitId())) {
                throw new IllegalArgumentException("The selected business does not belong to the selected unit.");
            }
        }

        if (locationId != null) {
            attendanceLocationRepository.loadLocation(companyId, locationId);
        }
    }

    protected Long normalizeOptionalForeignKey(Long value) {
        return value == null || value <= 0 ? null : value;
    }

    protected Map<String, Object> normalizePayload(Map<String, Object> payload) {
        return payload == null ? Map.of() : payload;
    }

    protected String normalizeManagedStatus(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "active", "activo" -> "active";
            case "inactive", "inactivo" -> "inactive";
            default -> throw new IllegalArgumentException("status must be active or inactive.");
        };
    }

    protected LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    protected void ensureAttendanceDateEditable(AttendanceHrUser user, LocalDate date) {
        AttendanceEditPolicy.requireEditable(user.hireDate(), date);
    }

    protected String attendanceEditLockReason(AttendanceHrUser user, LocalDate date) {
        return AttendanceEditPolicy.lockReason(user.hireDate(), date);
    }

    protected Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    protected void setNullableLong(java.sql.PreparedStatement statement, int parameterIndex, Long value) throws SQLException {
        if (value == null) {
            statement.setNull(parameterIndex, Types.BIGINT);
        } else {
            statement.setLong(parameterIndex, value);
        }
    }
}
