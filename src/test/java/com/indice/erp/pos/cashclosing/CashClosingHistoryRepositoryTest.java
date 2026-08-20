package com.indice.erp.pos.cashclosing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockingDetails;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class CashClosingHistoryRepositoryTest {

    @Test
    void everyHistoryFilterKeepsValidSqlBoundaries() {
        var jdbc = mock(JdbcTemplate.class);
        var repository = new CashClosingHistoryRepository(jdbc);
        var context = new PosContext(5L, 42L, "Operator", "admin", true, PosScope.corporateOffice());
        var filter = new CashClosingQueryFilter(
            LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31),
            7L, 9L, 11L, 13L, "Toronto", 10, 20
        );

        repository.findAll(context, filter);
        repository.countAll(context, filter);

        List<String> sqlStatements = mockingDetails(jdbc).getInvocations().stream()
            .map(invocation -> String.valueOf((Object) invocation.getArgument(0)))
            .toList();

        assertThat(sqlStatements).hasSize(2);
        assertThat(sqlStatements).allSatisfy(sql -> assertThat(sql)
            .contains("closing.cash_register_id = ?")
            .contains("closing.warehouse_id = ?")
            .contains("closing.shift_id = ?")
            .contains("closing.closed_by_user_id = ?")
            .contains("CONVERT(LOWER(CONCAT_WS")
            .contains("USING utf8mb4) COLLATE utf8mb4_unicode_ci LIKE ?")
            .doesNotContain("?ORDER BY"));
        assertThat(sqlStatements).anySatisfy(sql -> assertThat(sql)
            .contains("ORDER BY closing.closed_at DESC")
            .contains("LIMIT ? OFFSET ?"));
        assertThat(sqlStatements).anySatisfy(sql -> assertThat(sql)
            .contains("SELECT COUNT(*)")
            .doesNotContain("LIMIT ? OFFSET ?"));
    }
}
