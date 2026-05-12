package com.indice.erp.hr.attendance.usecases.locations;

import com.indice.erp.hr.attendance.models.LocationRow;
import com.indice.erp.hr.attendance.support.AttendanceLocationPresentation;
import com.indice.erp.hr.attendance.usecases.kiosk.HrAttendancePublicKioskPunchUseCases;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import com.indice.erp.hr.shared.HrPayloadUtils;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.shared.HrPayloadUtils.longList;


public abstract class HrAttendanceAllowedLocationUseCases extends HrAttendancePublicKioskPunchUseCases {

    protected HrAttendanceAllowedLocationUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    public Map<String, Object> listControlLocations(long companyId) {
        var body = new LinkedHashMap<String, Object>();
        body.put("items", loadLocationRows(companyId, false).stream().map(AttendanceLocationPresentation::toLocationMap).toList());
        return body;
    }

    @Transactional
    public Map<String, Object> replaceHrUserAllowedLocations(
        long companyId,
        long userId,
        long userCompanyId,
        Map<String, Object> payload
    ) {
        payload = normalizePayload(payload);
        var user = attendanceUserLookupService.loadAttendanceUser(companyId, userCompanyId);
        if ("terminated".equals(user.status())) {
            throw new IllegalArgumentException("Terminated users cannot receive attendance locations.");
        }

        var locationIds = HrPayloadUtils.longList(payload, "location_ids", "allowed_location_ids");
        var uniqueLocationIds = locationIds.stream()
            .filter((locationId) -> locationId != null && locationId > 0)
            .distinct()
            .toList();

        var locations = new ArrayList<LocationRow>();
        for (var locationId : uniqueLocationIds) {
            locations.add(loadLocation(companyId, locationId));
        }

        jdbcTemplate.update(
            """
                UPDATE user_allowed_locations
                SET status = 'inactive'
                WHERE company_id = ?
                  AND user_company_id = ?
                """,
            companyId,
            userCompanyId
        );

        for (var location : locations) {
            ensureHrUserAllowedLocation(companyId, userId, userCompanyId, location.id());
        }

        return Map.of(
            "user_company_id", userCompanyId,
            "allowed_locations", loadAllowedLocations(companyId, userCompanyId).stream().map(AttendanceLocationPresentation::toLocationMap).toList()
        );
    }
}
