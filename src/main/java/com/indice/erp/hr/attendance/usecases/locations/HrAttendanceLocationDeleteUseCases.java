package com.indice.erp.hr.attendance.usecases.locations;

import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.util.NoSuchElementException;
import org.springframework.transaction.annotation.Transactional;


public abstract class HrAttendanceLocationDeleteUseCases extends HrAttendanceLocationCrudUseCases {

    protected HrAttendanceLocationDeleteUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    @Transactional
    public void deleteLocation(long companyId, long locationId) {
        loadLocation(companyId, locationId);
        jdbcTemplate.update(
            """
                UPDATE attendance_schedule_templates
                SET enforce_location = 0,
                    location_id = NULL
                WHERE company_id = ?
                  AND location_id = ?
                """,
            companyId,
            locationId
        );
        var deleted = jdbcTemplate.update(
            "DELETE FROM attendance_locations WHERE company_id = ? AND id = ?",
            companyId,
            locationId
        );
        if (deleted == 0) {
            throw new NoSuchElementException("Attendance location not found.");
        }
    }
}
