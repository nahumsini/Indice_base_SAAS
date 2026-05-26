package com.indice.erp.hr.records;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrRecordScopeAccess {

    private final JdbcTemplate jdbcTemplate;
    private final HrOperationalScopeService hrOperationalScopeService;

    public HrRecordScopeAccess(
        JdbcTemplate jdbcTemplate,
        HrOperationalScopeService hrOperationalScopeService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.hrOperationalScopeService = hrOperationalScopeService;
    }

    public HrOperationalScope resolve(AuthSessionUser currentUser) {
        return hrOperationalScopeService.resolve(currentUser);
    }

    public String recordPredicate(HrOperationalScope scope) {
        return scope.assignmentPredicate(
            "r.user_unit_id_snapshot",
            "r.user_business_id_snapshot",
            "r.company_id"
        );
    }

    public List<Object> recordParameters(HrOperationalScope scope) {
        return scope.assignmentParameters();
    }

    public void requireRecordInScope(long companyId, HrOperationalScope scope, long recordId) {
        if (scope.isCorporateOffice()) {
            return;
        }

        var rows = jdbcTemplate.query(
            """
                SELECT user_unit_id_snapshot,
                       user_business_id_snapshot
                FROM user_records
                WHERE company_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                LIMIT 1
                """,
            (rs, rowNum) -> new RecordAssignment(
                getNullableLong(rs, "user_unit_id_snapshot"),
                getNullableLong(rs, "user_business_id_snapshot")
            ),
            companyId,
            recordId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Record not found.");
        }

        hrOperationalScopeService.requireAssignmentInScope(
            companyId,
            scope,
            rows.getFirst().unitId(),
            rows.getFirst().businessId()
        );
    }

    public void requireUserInScope(long companyId, HrOperationalScope scope, long userCompanyId) {
        hrOperationalScopeService.requireUserInScope(companyId, scope, userCompanyId);
    }

    public void requireAssignmentInScope(
        long companyId,
        HrOperationalScope scope,
        Long unitId,
        Long businessId
    ) {
        hrOperationalScopeService.requireAssignmentInScope(companyId, scope, unitId, businessId);
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private record RecordAssignment(Long unitId, Long businessId) {
    }
}
