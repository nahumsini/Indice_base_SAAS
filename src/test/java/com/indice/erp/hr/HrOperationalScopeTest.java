package com.indice.erp.hr;

import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class HrOperationalScopeTest {

    @Test
    void businessOfficePredicateLeavesASeparatorForTrailingSql() {
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        var sql = """
            SELECT *
            FROM hr_users e
            WHERE e.company_id = ?
              AND e.work_profile_id IS NOT NULL
            """
            + scope.hrUserPredicate("e")
            + """
            ORDER BY e.id DESC
            """;

        assertTrue(sql.contains("e.business_id = ?\nORDER BY"));
    }
}
