package com.indice.erp.kiosk.engine;

import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.hr.attendance.usecases.dashboard.HrAttendanceSelfDashboardUseCases.PersonalDay;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskService;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskService.PersonalTasks;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MultiKioskTodayService {
    private final MultiKioskService sessions;
    private final KioskMultiDashboardService dashboard;
    private final HrAttendanceService attendance;
    private final ProcessTaskKioskService tasks;
    public MultiKioskTodayService(MultiKioskService sessions, KioskMultiDashboardService dashboard,
            HrAttendanceService attendance, ProcessTaskKioskService tasks) {
        this.sessions = sessions; this.dashboard = dashboard; this.attendance = attendance; this.tasks = tasks;
    }
    public record Attendance(long kioskId, PersonalDay day) { }
    public record Tasks(long kioskId, PersonalTasks day) { }
    public record Today(String date, Attendance attendance, Tasks tasks) { }

    @Transactional
    public Today today(String publicToken, String sessionToken, String browserReference) {
        var context = sessions.employeeContext(publicToken, sessionToken, browserReference);
        var user = context.user();
        var date = LocalDate.now();
        var hr = dashboard.personalOverviewDefinition(user, context.multiKioskId(),
            KioskEmployeeToolCatalogService.ATTENDANCE_TOOL_KEY, "attendance.punch.create@1");
        var taskTool = dashboard.personalOverviewDefinition(user, context.multiKioskId(),
            KioskEmployeeToolCatalogService.MY_TASKS_TOOL_KEY, "process-tasks.tasks.read@1");
        return new Today(date.toString(), hr == null ? null
                : new Attendance(hr.id(), attendance.employeeDay(user.companyId(), user.userId(), date)),
            taskTool == null ? null : new Tasks(taskTool.id(), tasks.employeeDay(taskTool, user.userId(), date)));
    }
}
