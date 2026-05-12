package com.indice.erp.hr.attendance.usecases.jobs;

import com.indice.erp.hr.attendance.usecases.events.HrAttendanceSelfKioskEventUseCases;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.scheduledEndDateTime;


public abstract class HrAttendanceAutoCheckoutUseCases extends HrAttendanceSelfKioskEventUseCases {

    protected HrAttendanceAutoCheckoutUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    @Scheduled(fixedDelayString = "${app.hr.attendance.auto-checkout-delay-ms:300000}")
    @Transactional
    public void autoCheckoutOpenAttendanceRecords() {
        var now = LocalDateTime.now();
        var candidates = loadAutoCheckoutCandidates(now.toLocalDate());

        for (var candidate : candidates) {
            var scheduleRule = loadScheduleRule(candidate.companyId(), candidate.userCompanyId(), candidate.attendanceDate());
            if (scheduleRule == null || scheduleRule.isRestDay() || scheduleRule.endTime() == null) {
                continue;
            }

            var checkoutAt = scheduledEndDateTime(candidate.attendanceDate(), scheduleRule);
            if (checkoutAt.isAfter(now)) {
                continue;
            }
            if (candidate.firstCheckInAt() != null && checkoutAt.isBefore(candidate.firstCheckInAt())) {
                checkoutAt = candidate.firstCheckInAt();
            }
            if (hasSuccessfulCheckoutEvent(candidate.companyId(), candidate.userCompanyId(), candidate.attendanceDate())) {
                rebuildDailyRecordProjection(candidate.companyId(), candidate.userCompanyId(), candidate.attendanceDate());
                continue;
            }

            appendAttendanceEvent(
                candidate.companyId(),
                candidate.userCompanyId(),
                "check_out",
                checkoutAt,
                candidate.attendanceDate(),
                candidate.firstLocationId(),
                null,
                null,
                null,
                null,
                "system",
                "auto_checkout",
                "success",
                "check_out",
                toJson(Map.of(
                    "auto_checkout", true,
                    "reason", "missing_checkout",
                    "scheduled_end_time", scheduleRule.endTime().toString()
                )),
                "Auto checkout at scheduled end time.",
                null,
                0L
            );
            rebuildDailyRecordProjection(candidate.companyId(), candidate.userCompanyId(), candidate.attendanceDate());
        }
    }
}
