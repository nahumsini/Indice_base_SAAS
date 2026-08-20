package com.indice.erp.pos.ticket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.sql.Timestamp;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class TicketRepositoryTest {

    @Test
    void dailySummaryUsesCompletedTicketsUtcBoundariesAndOperationalScope() {
        var jdbc = mock(JdbcTemplate.class);
        var repository = new TicketRepository(jdbc, mock(TicketMapper.class));
        var context = new PosContext(
            5L, 42L, "Operator", "admin", true, PosScope.businessOffice(7L, 9L));
        var from = Instant.parse("2026-08-19T04:00:00Z");
        var to = Instant.parse("2026-08-20T04:00:00Z");

        repository.summarizeCompletedSalesBetween(context, from, to);

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(
            sql.capture(),
            any(RowMapper.class),
            eq(42L),
            eq(Timestamp.from(from)),
            eq(Timestamp.from(to)),
            eq(9L)
        );
        assertThat(sql.getValue())
            .contains("ticket.status = 'COMPLETED'")
            .contains("ticket.completed_at >= ?")
            .contains("ticket.completed_at < ?")
            .contains("ticket.business_id = ?")
            .contains("GROUP BY ticket.currency_code");
    }
}
