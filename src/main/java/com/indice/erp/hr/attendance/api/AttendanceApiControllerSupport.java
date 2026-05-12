package com.indice.erp.hr.attendance.api;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.hr.attendance.HrAttendanceService;


abstract class AttendanceApiControllerSupport {

    protected final SessionAuthService sessionAuthService;
    protected final HrAttendanceService hrAttendanceService;

    protected AttendanceApiControllerSupport(
        SessionAuthService sessionAuthService,
        HrAttendanceService hrAttendanceService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.hrAttendanceService = hrAttendanceService;
    }
}
