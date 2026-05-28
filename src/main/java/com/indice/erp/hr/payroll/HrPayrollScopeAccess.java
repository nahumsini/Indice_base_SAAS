package com.indice.erp.hr.payroll;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrPayrollScopeAccess {

    private final JdbcTemplate jdbcTemplate;
    private final HrOperationalScopeService hrOperationalScopeService;

    public HrPayrollScopeAccess(
        JdbcTemplate jdbcTemplate,
        HrOperationalScopeService hrOperationalScopeService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.hrOperationalScopeService = hrOperationalScopeService;
    }

    public HrOperationalScope resolve(AuthSessionUser currentUser) {
        return hrOperationalScopeService.resolve(currentUser);
    }

    public String runLinePredicate(HrOperationalScope scope, String alias) {
        var tableAlias = alias == null || alias.isBlank() ? "l" : alias.trim();
        return scope.assignmentPredicate(
            tableAlias + ".unit_id_snapshot",
            tableAlias + ".business_id_snapshot",
            tableAlias + ".company_id"
        );
    }

    public List<Object> runLineParameters(HrOperationalScope scope) {
        return scope.assignmentParameters();
    }

    public void requireRunLineInScope(long companyId, HrOperationalScope scope, long runId, long lineId) {
        if (scope.isCorporateOffice()) {
            return;
        }

        var rows = jdbcTemplate.query(
            """
                SELECT unit_id_snapshot,
                       business_id_snapshot
                FROM payroll_run_lines
                WHERE company_id = ?
                  AND run_id = ?
                  AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new PayrollLineAssignment(
                getNullableLong(rs, "unit_id_snapshot"),
                getNullableLong(rs, "business_id_snapshot")
            ),
            companyId,
            runId,
            lineId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Payroll run line not found.");
        }

        hrOperationalScopeService.requireAssignmentInScope(
            companyId,
            scope,
            rows.getFirst().unitId(),
            rows.getFirst().businessId()
        );
    }

    public void requireRunFullyInScope(long companyId, HrOperationalScope scope, long runId) {
        if (!isRunFullyInScope(companyId, scope, runId)) {
            throw new HrAccessDeniedException("Forbidden");
        }
    }

    public boolean isRunFullyInScope(long companyId, HrOperationalScope scope, long runId) {
        if (scope.isCorporateOffice()) {
            return true;
        }

        var rows = jdbcTemplate.query(
            """
                SELECT unit_id_snapshot,
                       business_id_snapshot
                FROM payroll_run_lines
                WHERE company_id = ?
                  AND run_id = ?
                """,
            (rs, rowNum) -> new PayrollLineAssignment(
                getNullableLong(rs, "unit_id_snapshot"),
                getNullableLong(rs, "business_id_snapshot")
            ),
            companyId,
            runId
        );

        for (var row : rows) {
            if (!hrOperationalScopeService.containsAssignment(companyId, scope, row.unitId(), row.businessId())) {
                return false;
            }
        }
        return true;
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private record PayrollLineAssignment(Long unitId, Long businessId) {
    }
}
