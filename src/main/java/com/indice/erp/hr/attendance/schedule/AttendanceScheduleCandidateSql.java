package com.indice.erp.hr.attendance.schedule;

import com.indice.erp.hr.HrOperationalScope;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;


final class AttendanceScheduleCandidateSql {

    private AttendanceScheduleCandidateSql() {
    }

    static CandidateSql all(long companyId, HrOperationalScope scope, String search, Long unitId, Long businessId) {
        var where = new StringBuilder(
            """
            e.company_id = ?
              AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
            """
        );
        var params = new ArrayList<Object>();
        params.add(companyId);
        appendScope(where, params, scope);
        appendFilters(where, params, search, unitId, businessId);
        return new CandidateSql(where.toString(), params);
    }

    static CandidateSql available(
        long companyId,
        HrOperationalScope scope,
        LocalDate startDate,
        LocalDate rangeEnd,
        String search,
        Long unitId,
        Long businessId
    ) {
        var where = new StringBuilder(availableBaseWhere());
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.add(rangeEnd);
        params.add(startDate);
        params.add(startDate);
        params.add(rangeEnd);
        params.add(startDate);
        params.add(rangeEnd);
        appendScope(where, params, scope);
        appendFilters(where, params, search, unitId, businessId);
        return new CandidateSql(where.toString(), params);
    }

    private static void appendScope(StringBuilder where, List<Object> params, HrOperationalScope scope) {
        if (scope == null || scope.isCorporateOffice()) {
            return;
        }
        where.append(scope.hrUserPredicate("e"));
        params.addAll(scope.hrUserParameters());
    }

    private static void appendFilters(StringBuilder where, List<Object> params, String search, Long unitId, Long businessId) {
        if (search != null && !search.isBlank()) {
            var like = "%" + search + "%";
            where.append(
                """
                  AND (
                    LOWER(TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, '')))) LIKE ?
                    OR LOWER(COALESCE(e.user_code, '')) LIKE ?
                    OR LOWER(COALESCE(e.position, '')) LIKE ?
                    OR LOWER(COALESCE(e.department, '')) LIKE ?
                  )
                """
            );
            params.add(like);
            params.add(like);
            params.add(like);
            params.add(like);
        }
        if (unitId != null) {
            where.append(" AND e.unit_id = ?");
            params.add(unitId);
        }
        if (businessId != null) {
            where.append(" AND e.business_id = ?");
            params.add(businessId);
        }
    }

    private static String availableBaseWhere() {
        return """
            e.company_id = ?
              AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
              AND NOT EXISTS (
                  SELECT 1 FROM user_work_site_assignments work_site_assignment
                  JOIN attendance_locations work_site_location ON work_site_location.id = work_site_assignment.location_id
                  WHERE work_site_assignment.company_id = e.company_id
                    AND work_site_assignment.user_company_id = e.id
                    AND LOWER(COALESCE(work_site_assignment.status, 'active')) = 'active'
                    AND LOWER(COALESCE(work_site_location.status, 'active')) = 'active'
                    AND work_site_assignment.effective_start_date <= ?
                    AND (work_site_assignment.effective_end_date IS NULL OR work_site_assignment.effective_end_date >= ?)
              )
              AND NOT EXISTS (
                  SELECT 1 FROM user_attendance_events attendance_event
                  WHERE attendance_event.company_id = e.company_id
                    AND attendance_event.user_company_id = e.id
                    AND attendance_event.attendance_date BETWEEN ? AND ?
                    AND attendance_event.event_type IN ('check_in', 'check_out', 'break_out', 'break_in')
              )
              AND NOT EXISTS (
                  SELECT 1 FROM user_attendance_daily_records daily_record
                  WHERE daily_record.company_id = e.company_id
                    AND daily_record.user_company_id = e.id
                    AND daily_record.attendance_date BETWEEN ? AND ?
                    AND (daily_record.first_check_in_at IS NOT NULL OR daily_record.last_check_out_at IS NOT NULL)
              )
            """;
    }

    record CandidateSql(String where, List<Object> params) {
    }
}
