package com.indice.erp.hr.attendance.api;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrAccessService.HrTab;
import com.indice.erp.hr.attendance.HrAttendanceService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;


abstract class AttendanceApiControllerSupport {

    protected final SessionAuthService sessionAuthService;
    protected final HrAttendanceService hrAttendanceService;
    protected final HrAccessService hrAccessService;

    protected AttendanceApiControllerSupport(
        SessionAuthService sessionAuthService,
        HrAttendanceService hrAttendanceService,
        HrAccessService hrAccessService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.hrAttendanceService = hrAttendanceService;
        this.hrAccessService = hrAccessService;
    }

    protected boolean canAccessControl(AuthSessionUser currentUser) {
        return hrAccessService.canAccessManagementTab(currentUser, HrTab.CONTROL);
    }

    protected boolean canReadAttendance(AuthSessionUser currentUser) {
        return hrAccessService.canAccessReadableTab(currentUser, HrTab.ATTENDANCE);
    }

    protected boolean canRecordSelfAttendance(AuthSessionUser currentUser) {
        return canReadAttendance(currentUser);
    }

    protected boolean canWriteSelfAttendance(AuthSessionUser currentUser) {
        return canAccessControl(currentUser);
    }

    protected ResponseEntity<?> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
    }
}
