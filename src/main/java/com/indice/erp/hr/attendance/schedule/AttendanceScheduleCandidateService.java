package com.indice.erp.hr.attendance.schedule;

import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.attendance.assignment.AttendanceAssignmentService;
import com.indice.erp.hr.attendance.records.AttendanceDailyRecordRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;


@Service
public class AttendanceScheduleCandidateService {

    private final AttendanceAssignmentService attendanceAssignmentService;
    private final AttendanceDailyRecordRepository attendanceDailyRecordRepository;
    private final AttendanceScheduleCandidateRepository candidateRepository;
    private final AttendanceScheduleStateRepository stateRepository;
    private final AttendanceScheduleWorkSiteRepository workSiteRepository;
    private final AttendanceScheduleCandidateMapper candidateMapper;

    public AttendanceScheduleCandidateService(
        AttendanceAssignmentService attendanceAssignmentService,
        AttendanceDailyRecordRepository attendanceDailyRecordRepository,
        AttendanceScheduleCandidateRepository candidateRepository,
        AttendanceScheduleStateRepository stateRepository,
        AttendanceScheduleWorkSiteRepository workSiteRepository,
        AttendanceScheduleCandidateMapper candidateMapper
    ) {
        this.attendanceAssignmentService = attendanceAssignmentService;
        this.attendanceDailyRecordRepository = attendanceDailyRecordRepository;
        this.candidateRepository = candidateRepository;
        this.stateRepository = stateRepository;
        this.workSiteRepository = workSiteRepository;
        this.candidateMapper = candidateMapper;
    }

    public Map<String, Object> scheduleCandidates(
        long companyId,
        LocalDate startDate,
        LocalDate endDate,
        int page,
        int size,
        String search,
        Long unitId,
        Long businessId,
        boolean availableOnly
    ) {
        return scheduleCandidates(
            companyId,
            HrOperationalScope.corporateOffice(),
            startDate,
            endDate,
            page,
            size,
            search,
            unitId,
            businessId,
            availableOnly
        );
    }

    public Map<String, Object> scheduleCandidates(
        long companyId,
        HrOperationalScope scope,
        LocalDate startDate,
        LocalDate endDate,
        int page,
        int size,
        String search,
        Long unitId,
        Long businessId,
        boolean availableOnly
    ) {
        if (endDate != null && endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("effective_end_date must be on or after effective_start_date.");
        }

        var safePage = Math.max(1, page);
        var safeSize = Math.max(5, Math.min(size, 50));
        var normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        var normalizedUnitId = unitId != null && unitId > 0 ? unitId : null;
        var normalizedBusinessId = businessId != null && businessId > 0 ? businessId : null;
        var rangeEnd = attendanceAssignmentService.assignmentRangeEnd(endDate);
        var availableCount = candidateRepository.countAvailable(
            companyId,
            scope,
            startDate,
            rangeEnd,
            normalizedSearch,
            normalizedUnitId,
            normalizedBusinessId
        );
        var allFilteredCount = candidateRepository.countAll(companyId, scope, normalizedSearch, normalizedUnitId, normalizedBusinessId);
        var totalCount = availableOnly ? availableCount : allFilteredCount;
        var totalPages = Math.max(1, (int) Math.ceil((double) totalCount / safeSize));
        safePage = Math.min(safePage, totalPages);
        var offset = (safePage - 1) * safeSize;

        var pageUsers = candidateRepository.listUsers(
            companyId,
            scope,
            startDate,
            rangeEnd,
            normalizedSearch,
            normalizedUnitId,
            normalizedBusinessId,
            availableOnly,
            safeSize,
            offset
        );
        var currentAssignments = stateRepository.loadCurrentAssignments(companyId, startDate);
        var scheduleRulesByUser = stateRepository.loadScheduleRules(companyId, startDate);
        var dailyRecordsByUser = attendanceDailyRecordRepository.loadDailyRecords(companyId, startDate);
        var activeWorkSitesByUser = workSiteRepository.loadActiveWorkSiteAssignments(companyId, startDate);
        var items = new ArrayList<Map<String, Object>>();
        for (var user : pageUsers) {
            var dailyRecord = dailyRecordsByUser.get(user.id());
            var hasRangeActivity = attendanceAssignmentService.hasAttendanceActivityInRange(companyId, user.id(), startDate, endDate);
            var hasActivity = hasRangeActivity || candidateMapper.hasAttendanceActivity(dailyRecord);
            var hasWorkSiteOverlap = !hasActivity
                && attendanceAssignmentService.hasActiveWorkSiteAssignmentOverlap(companyId, user.id(), startDate, endDate);
            items.add(candidateMapper.toScheduleCandidateMap(
                user,
                startDate,
                currentAssignments.get(user.id()),
                scheduleRulesByUser.get(user.id()),
                dailyRecord,
                activeWorkSitesByUser.get(user.id()),
                hasRangeActivity,
                hasWorkSiteOverlap
            ));
        }

        var body = new LinkedHashMap<String, Object>();
        body.put("date", startDate.toString());
        body.put("effective_end_date", endDate == null ? null : endDate.toString());
        body.put("items", items);
        body.put("page", safePage);
        body.put("size", safeSize);
        body.put("total_count", totalCount);
        body.put("total_pages", totalPages);
        body.put("available_count", availableCount);
        body.put("busy_count", Math.max(0, allFilteredCount - availableCount));
        body.put("unit_options", candidateRepository.listUnitOptions(companyId, scope));
        body.put("business_options", candidateRepository.listBusinessOptions(companyId, scope));
        return body;
    }
}
