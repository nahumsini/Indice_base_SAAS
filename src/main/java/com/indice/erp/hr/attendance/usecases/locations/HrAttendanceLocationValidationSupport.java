package com.indice.erp.hr.attendance.usecases.locations;

import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;


public abstract class HrAttendanceLocationValidationSupport extends HrAttendanceWorkSiteUseCases {

    protected HrAttendanceLocationValidationSupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected void ensureUniqueLocationName(long companyId, Long locationId, String name) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM attendance_locations
                WHERE company_id = ?
                  AND LOWER(name) = LOWER(?)
                  AND (? IS NULL OR id <> ?)
                """,
            Integer.class,
            companyId,
            name,
            locationId,
            locationId
        );

        if (count != null && count > 0) {
            throw new IllegalArgumentException("Attendance location name must be unique.");
        }
    }
}
