package com.indice.erp.hr.attendance.locations;

import com.indice.erp.hr.attendance.models.LocationRow;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import org.springframework.stereotype.Component;

import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


@Component
class AttendanceLocationMapper {

    LocationRow mapBasic(ResultSet rs) throws SQLException {
        return map(rs, true, false);
    }

    LocationRow mapWithAssignments(ResultSet rs) throws SQLException {
        return map(rs, true, true);
    }

    LocationRow mapAllowed(ResultSet rs) throws SQLException {
        return map(rs, false, false);
    }

    private LocationRow map(ResultSet rs, boolean includeManagedSource, boolean includeAssignments) throws SQLException {
        return new LocationRow(
            rs.getLong("id"),
            getNullableLong(rs, "unit_id"),
            safe(rs.getString("unit_name")),
            getNullableLong(rs, "business_id"),
            safe(rs.getString("business_name")),
            rs.getObject("contract_start_date", LocalDate.class),
            rs.getObject("contract_end_date", LocalDate.class),
            safe(rs.getString("name")),
            rs.getBigDecimal("latitude"),
            rs.getBigDecimal("longitude"),
            rs.getInt("radius_meters"),
            rs.getBigDecimal("required_hours_per_day"),
            rs.getObject("required_start_time", LocalTime.class),
            rs.getObject("required_end_time", LocalTime.class),
            rs.getInt("required_days_per_week"),
            includeManagedSource ? safe(rs.getString("managed_source")) : "",
            safe(rs.getString("status")),
            includeAssignments ? rs.getInt("assigned_user_count") : 0,
            includeAssignments ? safe(rs.getString("assigned_user_names")) : ""
        );
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }
}
