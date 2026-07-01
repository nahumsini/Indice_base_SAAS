package com.indice.erp.hr.permissions;

import com.indice.erp.hr.attendance.HrAttendanceService;
import org.springframework.stereotype.Service;

@Service
public class HrPermissionAttendanceSyncService {

    private final HrPermissionAttendanceSyncRepository syncRepository;
    private final HrAttendanceService attendanceService;

    public HrPermissionAttendanceSyncService(
        HrPermissionAttendanceSyncRepository syncRepository,
        HrAttendanceService attendanceService
    ) {
        this.syncRepository = syncRepository;
        this.attendanceService = attendanceService;
    }

    public void syncApprovedLeaveStatus(long companyId, long actorUserId, long requestId) {
        var window = syncRepository.loadApprovedWindow(companyId, requestId);
        attendanceService.markPermissionLeaveDays(
            companyId,
            actorUserId,
            requestId,
            window.userCompanyId(),
            window.startDate(),
            window.endDate(),
            window.payrollTreatment()
        );
    }
}
