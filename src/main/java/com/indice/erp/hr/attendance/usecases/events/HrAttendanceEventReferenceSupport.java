package com.indice.erp.hr.attendance.usecases.events;

import com.indice.erp.hr.attendance.usecases.schedule.HrAttendanceScheduleWindowSupport;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;


public abstract class HrAttendanceEventReferenceSupport extends HrAttendanceScheduleWindowSupport {

    protected HrAttendanceEventReferenceSupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected void ensureUserAttendanceReferenceRows(long companyId, Long locationId, Long kioskDeviceId) {
        if (locationId != null) {
            mirrorAttendanceLocation(companyId, locationId);
        }
        if (kioskDeviceId == null) {
            return;
        }

        var kioskLocationIds = jdbcTemplate.query(
            """
                SELECT location_id
                FROM attendance_kiosk_devices
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> getNullableLong(rs, "location_id"),
            companyId,
            kioskDeviceId
        );
        if (!kioskLocationIds.isEmpty() && kioskLocationIds.getFirst() != null) {
            mirrorAttendanceLocation(companyId, kioskLocationIds.getFirst());
        }

        jdbcTemplate.update(
            """
                INSERT INTO attendance_kiosk_devices
                (id, company_id, unit_id, business_id, location_id, code, name, status, public_access_token,
                 metadata_json, created_by, created_at, updated_at)
                SELECT d.id,
                       d.company_id,
                       d.unit_id,
                       d.business_id,
                       d.location_id,
                       d.code,
                       d.name,
                       d.status,
                       d.public_access_token,
                       d.metadata_json,
                       CASE WHEN created_user.id IS NULL THEN NULL ELSE d.created_by END,
                       d.created_at,
                       d.updated_at
                FROM attendance_kiosk_devices d
                LEFT JOIN users created_user ON created_user.id = d.created_by
                WHERE d.company_id = ?
                  AND d.id = ?
                ON DUPLICATE KEY UPDATE
                  unit_id = VALUES(unit_id),
                  business_id = VALUES(business_id),
                  location_id = VALUES(location_id),
                  code = VALUES(code),
                  name = VALUES(name),
                  status = VALUES(status),
                  public_access_token = VALUES(public_access_token),
                  metadata_json = VALUES(metadata_json)
                """,
            companyId,
            kioskDeviceId
        );
    }

    protected void mirrorAttendanceLocation(long companyId, long locationId) {
        jdbcTemplate.update(
            """
                INSERT INTO attendance_locations
                (id, company_id, unit_id, business_id, contract_start_date, contract_end_date, name, latitude, longitude,
                 radius_meters, required_hours_per_day, required_start_time, required_end_time, required_days_per_week,
                 status, managed_source, created_by, created_at, updated_at)
                SELECT l.id,
                       l.company_id,
                       l.unit_id,
                       l.business_id,
                       l.contract_start_date,
                       l.contract_end_date,
                       l.name,
                       l.latitude,
                       l.longitude,
                       l.radius_meters,
                       l.required_hours_per_day,
                       l.required_start_time,
                       l.required_end_time,
                       l.required_days_per_week,
                       l.status,
                       l.managed_source,
                       CASE WHEN created_user.id IS NULL THEN NULL ELSE l.created_by END,
                       l.created_at,
                       l.updated_at
                FROM attendance_locations l
                LEFT JOIN users created_user ON created_user.id = l.created_by
                WHERE l.company_id = ?
                  AND l.id = ?
                ON DUPLICATE KEY UPDATE
                  unit_id = VALUES(unit_id),
                  business_id = VALUES(business_id),
                  contract_start_date = VALUES(contract_start_date),
                  contract_end_date = VALUES(contract_end_date),
                  name = VALUES(name),
                  latitude = VALUES(latitude),
                  longitude = VALUES(longitude),
                  radius_meters = VALUES(radius_meters),
                  required_hours_per_day = VALUES(required_hours_per_day),
                  required_start_time = VALUES(required_start_time),
                  required_end_time = VALUES(required_end_time),
                  required_days_per_week = VALUES(required_days_per_week),
                  status = VALUES(status),
                  managed_source = VALUES(managed_source)
                """,
            companyId,
            locationId
        );
    }
}
