package com.indice.erp.hr.attendance.support;

import com.indice.erp.hr.attendance.models.LocationRow;
import java.util.LinkedHashMap;
import java.util.Map;

import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.shared.HrPayloadUtils.nullable;


public final class AttendanceLocationPresentation {

    private AttendanceLocationPresentation() {
    }

    public static Map<String, Object> toLocationMap(LocationRow location) {
        if (location == null) {
            return null;
        }
        var body = new LinkedHashMap<String, Object>();
        body.put("id", location.id());
        body.put("unit_id", location.unitId());
        body.put("unit_name", nullable(location.unitName()));
        body.put("business_id", location.businessId());
        body.put("business_name", nullable(location.businessName()));
        body.put("contract_start_date", location.contractStartDate() == null ? null : location.contractStartDate().toString());
        body.put("contract_end_date", location.contractEndDate() == null ? null : location.contractEndDate().toString());
        body.put("name", location.name());
        body.put("latitude", location.latitude());
        body.put("longitude", location.longitude());
        body.put("radius_meters", location.radiusMeters());
        body.put("required_hours_per_day", location.requiredHoursPerDay());
        body.put("required_start_time", location.requiredStartTime() == null ? null : location.requiredStartTime().toString());
        body.put("required_end_time", location.requiredEndTime() == null ? null : location.requiredEndTime().toString());
        body.put("required_days_per_week", location.requiredDaysPerWeek());
        body.put("managed_source", nullable(location.managedSource()));
        body.put("status", location.status());
        body.put("assigned_user_count", location.assignedUserCount());
        body.put("assigned_user_names", location.assignedUserNames());
        return body;
    }
}
