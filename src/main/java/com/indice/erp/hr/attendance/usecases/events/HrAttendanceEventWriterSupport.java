package com.indice.erp.hr.attendance.usecases.events;

import com.indice.erp.hr.attendance.models.AttendanceUser;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

import static com.indice.erp.hr.shared.HrPayloadUtils.nullable;


public abstract class HrAttendanceEventWriterSupport extends HrAttendanceEventReferenceSupport {

    protected HrAttendanceEventWriterSupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected long appendAttendanceEvent(
        long companyId,
        long userCompanyId,
        String eventType,
        LocalDateTime eventTimestamp,
        LocalDate attendanceDate,
        Long locationId,
        Long kioskDeviceId,
        BigDecimal latitude,
        BigDecimal longitude,
        String photoObjectKey,
        String source,
        String authMethod,
        String resultStatus,
        String eventKind,
        String metadataJson,
        String notes,
        Long supersedesEventId,
        long createdBy
    ) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO user_attendance_events
                    (company_id, user_id, user_company_id, event_type, event_timestamp, attendance_date, location_id, kiosk_device_id,
                     latitude, longitude, photo_url, source, auth_method, result_status, event_kind, notes, metadata_json, supersedes_event_id, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setLong(2, attendanceUserLookupService.loadUserIdForCompanyUser(companyId, userCompanyId));
            statement.setLong(3, userCompanyId);
            statement.setString(4, eventType);
            statement.setTimestamp(5, Timestamp.valueOf(eventTimestamp));
            statement.setObject(6, attendanceDate == null ? eventTimestamp.toLocalDate() : attendanceDate);
            setNullableLong(statement, 7, locationId);
            setNullableLong(statement, 8, kioskDeviceId);
            if (latitude == null) {
                statement.setNull(9, Types.DECIMAL);
            } else {
                statement.setBigDecimal(9, latitude);
            }
            if (longitude == null) {
                statement.setNull(10, Types.DECIMAL);
            } else {
                statement.setBigDecimal(10, longitude);
            }
            statement.setString(11, nullable(photoObjectKey));
            statement.setString(12, source);
            statement.setString(13, authMethod);
            statement.setString(14, resultStatus);
            statement.setString(15, eventKind);
            statement.setString(16, nullable(notes));
            statement.setString(17, metadataJson);
            setNullableLong(statement, 18, supersedesEventId);
            statement.setLong(19, createdBy);
            return statement;
        }, keyHolder);

        return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
    }

    protected long appendUserAttendanceEvent(
        long companyId,
        AttendanceUser user,
        String eventType,
        LocalDateTime eventTimestamp,
        LocalDate attendanceDate,
        Long locationId,
        Long kioskDeviceId,
        BigDecimal latitude,
        BigDecimal longitude,
        String photoObjectKey,
        String source,
        String authMethod,
        String resultStatus,
        String eventKind,
        String metadataJson,
        String notes,
        Long supersedesEventId,
        long createdBy
    ) {
        ensureUserAttendanceReferenceRows(companyId, locationId, kioskDeviceId);
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO user_attendance_events
                    (company_id, user_id, user_company_id, event_type, event_timestamp, attendance_date, location_id, kiosk_device_id,
                     latitude, longitude, photo_url, source, auth_method, result_status, event_kind, notes, metadata_json, supersedes_event_id, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setLong(2, user.userId());
            statement.setLong(3, user.userCompanyId());
            statement.setString(4, eventType);
            statement.setTimestamp(5, Timestamp.valueOf(eventTimestamp));
            statement.setObject(6, attendanceDate == null ? eventTimestamp.toLocalDate() : attendanceDate);
            setNullableLong(statement, 7, locationId);
            setNullableLong(statement, 8, kioskDeviceId);
            if (latitude == null) {
                statement.setNull(9, Types.DECIMAL);
            } else {
                statement.setBigDecimal(9, latitude);
            }
            if (longitude == null) {
                statement.setNull(10, Types.DECIMAL);
            } else {
                statement.setBigDecimal(10, longitude);
            }
            statement.setString(11, nullable(photoObjectKey));
            statement.setString(12, source);
            statement.setString(13, authMethod);
            statement.setString(14, resultStatus);
            statement.setString(15, eventKind);
            statement.setString(16, nullable(notes));
            statement.setString(17, metadataJson);
            setNullableLong(statement, 18, supersedesEventId);
            statement.setLong(19, createdBy);
            return statement;
        }, keyHolder);

        return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
    }
}
