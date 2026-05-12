package com.indice.erp.hr.attendance.usecases.locations;

import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import com.indice.erp.hr.shared.HrPayloadUtils;
import java.time.LocalTime;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.attendance.support.AttendanceInput.normalizeRequiredHoursPerDay;
import static com.indice.erp.hr.attendance.support.AttendanceInput.parseDecimalRequired;
import static com.indice.erp.hr.attendance.support.AttendanceInput.parseTime;
import static com.indice.erp.hr.attendance.support.AttendanceInput.validatePreferredTimeRange;
import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseBigDecimal;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseDate;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseInteger;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;


public abstract class HrAttendanceLocationCrudUseCases extends HrAttendanceLocationValidationSupport {

    protected HrAttendanceLocationCrudUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    @Transactional
    public Map<String, Object> saveLocation(long companyId, long userId, Long locationId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var name = stringValue(payload, "name", "nombre");
        if (name.isBlank()) {
            throw new IllegalArgumentException("name is required.");
        }

        var latitude = parseDecimalRequired(payload, "latitude");
        var longitude = parseDecimalRequired(payload, "longitude");
        var radiusMeters = HrPayloadUtils.parseInteger(payload, "radius_meters", "radius");
        if (radiusMeters == null || radiusMeters <= 0) {
            throw new IllegalArgumentException("radius_meters must be greater than zero.");
        }
        var contractStartDate = HrPayloadUtils.parseDate(payload, "contract_start_date", "contractStartDate");
        if (contractStartDate == null) {
            throw new IllegalArgumentException("contract_start_date is required.");
        }
        var contractEndDate = HrPayloadUtils.parseDate(payload, "contract_end_date", "contractEndDate");
        if (contractEndDate == null) {
            throw new IllegalArgumentException("contract_end_date is required.");
        }
        if (contractEndDate.isBefore(contractStartDate)) {
            throw new IllegalArgumentException("contract_end_date must be on or after contract_start_date.");
        }
        var requiredStartTime = parseTime(payload, "required_start_time");
        if (requiredStartTime == null) {
            requiredStartTime = LocalTime.of(8, 0);
        }
        var requiredEndTime = parseTime(payload, "required_end_time");
        if (requiredEndTime == null) {
            requiredEndTime = LocalTime.of(16, 0);
        }
        validatePreferredTimeRange(requiredStartTime, requiredEndTime);
        var requiredHoursPerDay = normalizeRequiredHoursPerDay(
            HrPayloadUtils.parseBigDecimal(payload, "required_hours_per_day", "requiredHoursPerDay")
        );
        var requiredDaysPerWeek = HrPayloadUtils.parseInteger(payload, "required_days_per_week", "requiredDaysPerWeek");
        if (requiredDaysPerWeek == null) {
            requiredDaysPerWeek = 5;
        }
        if (requiredDaysPerWeek < 1 || requiredDaysPerWeek > 7) {
            throw new IllegalArgumentException("required_days_per_week must be between 1 and 7.");
        }
        var unitId = normalizeOptionalForeignKey(parseLong(payload, "unit_id", "unitId"));
        var businessId = normalizeOptionalForeignKey(parseLong(payload, "business_id", "businessId"));

        var status = normalizeManagedStatus(stringValue(payload, "status"));
        ensureUniqueLocationName(companyId, locationId, name);
        validateOperationalScope(companyId, unitId, businessId, null);

        if (locationId == null || locationId <= 0) {
            var insertRequiredStartTime = requiredStartTime;
            var insertRequiredEndTime = requiredEndTime;
            var insertRequiredDaysPerWeek = requiredDaysPerWeek;
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                var statement = connection.prepareStatement(
                    """
                        INSERT INTO attendance_locations
                        (company_id, unit_id, business_id, contract_start_date, contract_end_date, name, latitude, longitude, radius_meters, required_hours_per_day, required_start_time, required_end_time, required_days_per_week, status, managed_source, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'contract_site', ?)
                        """,
                    new String[] {"id"}
                );
                statement.setLong(1, companyId);
                setNullableLong(statement, 2, unitId);
                setNullableLong(statement, 3, businessId);
                statement.setObject(4, contractStartDate);
                statement.setObject(5, contractEndDate);
                statement.setString(6, name);
                statement.setBigDecimal(7, latitude);
                statement.setBigDecimal(8, longitude);
                statement.setInt(9, radiusMeters);
                statement.setBigDecimal(10, requiredHoursPerDay);
                statement.setObject(11, insertRequiredStartTime);
                statement.setObject(12, insertRequiredEndTime);
                statement.setInt(13, insertRequiredDaysPerWeek);
                statement.setString(14, status);
                statement.setLong(15, userId);
                return statement;
            }, keyHolder);
            locationId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
        } else {
            var updated = jdbcTemplate.update(
                """
                    UPDATE attendance_locations
                    SET unit_id = ?,
                        business_id = ?,
                        contract_start_date = ?,
                        contract_end_date = ?,
                        name = ?,
                        latitude = ?,
	                        longitude = ?,
	                        radius_meters = ?,
	                        required_hours_per_day = ?,
	                        required_start_time = ?,
	                        required_end_time = ?,
	                        required_days_per_week = ?,
	                        status = ?,
                            managed_source = 'contract_site'
                    WHERE id = ? AND company_id = ?
                    """,
                unitId,
                businessId,
                contractStartDate,
                contractEndDate,
                name,
                latitude,
	                longitude,
	                radiusMeters,
	                requiredHoursPerDay,
	                requiredStartTime,
	                requiredEndTime,
	                requiredDaysPerWeek,
                status,
                locationId,
                companyId
            );
            if (updated == 0) {
                throw new NoSuchElementException("Attendance location not found.");
            }
        }

        var location = loadLocation(companyId, locationId);
        return Map.of("location", toLocationMap(location));
    }

}
