package com.indice.erp.pos.selfservice;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.status.CashRegisterStatus;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SelfServiceKioskRepositoryTest {

    @Test
    void operationalAssignmentRequiresActiveRegisterAndMatchingActiveWarehouseScope() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var repository = new SelfServiceKioskRepository(jdbcTemplate);
        when(jdbcTemplate.queryForObject(
            anyString(), eq(Long.class), any(Object[].class))).thenReturn(1L);

        assertThat(repository.hasOperationalRegisterAssignment(7L, 13L, 2L, 3L, 11L))
            .isTrue();

        var sql = ArgumentCaptor.forClass(String.class);
        var arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).queryForObject(sql.capture(), eq(Long.class), arguments.capture());
        assertThat(sql.getValue())
            .contains("register.is_active = 1")
            .contains("UPPER(register.status) = 'ACTIVE'")
            .contains("register.unit_id = ? AND register.business_id = ?")
            .contains("register.warehouse_id = ?")
            .contains("LOWER(COALESCE(warehouse.status, 'active')) = 'active'")
            .contains("TRIM(warehouse.business_unit_id) = CAST(? AS CHAR)")
            .contains("TRIM(warehouse.business_id) = CAST(? AS CHAR)");
        assertThat(arguments.getValue()).containsExactly(7L, 13L, 2L, 3L, 11L, 2L, 3L);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void catalogFiltersNegativePricesAndInvalidCurrenciesAtTheSqlBoundary() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var repository = new SelfServiceKioskRepository(jdbcTemplate);
        when(jdbcTemplate.query(any(String.class), any(RowMapper.class), any(Object[].class)))
            .thenReturn(List.of());

        repository.catalog(kiosk());

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sql.capture(), any(RowMapper.class), any(Object[].class));
        assertThat(sql.getValue())
            .contains("product.price IS NOT NULL AND product.price >= 0")
            .contains("TRIM(product.currency) REGEXP '^[A-Za-z]{3}$'")
            .contains("UPPER(TRIM(product.currency)) AS currency");
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void pendingQueryDoesNotMutateExpiredRowsInsideAReadOnlyServiceCall() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var repository = new SelfServiceKioskRepository(jdbcTemplate);
        when(jdbcTemplate.query(any(String.class), any(RowMapper.class), any(Object[].class)))
            .thenReturn(List.of());

        repository.listPending(context(), register());

        verify(jdbcTemplate, never()).update(contains("SET status = 'EXPIRED'"));
    }

    @Test
    void releaseClaimIsAtomicAndBoundToOwnerRegisterExpiryAndScope() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var repository = new SelfServiceKioskRepository(jdbcTemplate);
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(0);

        assertThat(repository.releaseClaim(context(), 41L, register())).isFalse();

        var sql = ArgumentCaptor.forClass(String.class);
        var arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(sql.capture(), arguments.capture());
        assertThat(sql.getValue())
            .contains("JOIN pos_cash_registers register")
            .contains("JOIN sales_inventory_warehouses warehouse")
            .contains("preticket.status = 'CLAIMED'")
            .contains("preticket.cash_register_id = ?")
            .contains("preticket.claimed_by_user_id = ?")
            .contains("preticket.unit_id = ? AND preticket.business_id = ?")
            .contains("preticket.warehouse_id = ?")
            .contains("register.is_active = 1 AND UPPER(register.status) = 'ACTIVE'")
            .contains("preticket.expires_at > CURRENT_TIMESTAMP")
            .contains("preticket.business_id = ?");
        assertThat(arguments.getValue()).containsExactly(
            7L, 41L, 13L, 5L, 2L, 3L, 11L, 3L);
    }

    @Test
    void claimAtomicallyRechecksRegisterAndWarehouseBeforeChangingPendingState() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var repository = new SelfServiceKioskRepository(jdbcTemplate);
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(0);

        assertThat(repository.claim(context(), 41L, register())).isFalse();

        var sql = ArgumentCaptor.forClass(String.class);
        var arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(sql.capture(), arguments.capture());
        assertThat(sql.getValue())
            .contains("JOIN pos_cash_registers register")
            .contains("JOIN sales_inventory_warehouses warehouse")
            .contains("preticket.status = 'PENDING'")
            .contains("register.is_active = 1 AND UPPER(register.status) = 'ACTIVE'")
            .contains("register.warehouse_id = preticket.warehouse_id")
            .contains("LOWER(COALESCE(warehouse.status, 'active')) = 'active'")
            .contains("preticket.expires_at > CURRENT_TIMESTAMP")
            .contains("preticket.business_id = ?");
        assertThat(arguments.getValue()).containsExactly(
            5L, 7L, 41L, 13L, 2L, 3L, 11L, 3L);
    }

    @Test
    void completingAClaimLinksTheTicketAndRequiresTheSameCashierRegisterAndScope() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var repository = new SelfServiceKioskRepository(jdbcTemplate);
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);

        assertThat(repository.completeClaim(context(), 41L, register(), 91L)).isTrue();

        var sql = ArgumentCaptor.forClass(String.class);
        var arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).update(sql.capture(), arguments.capture());
        assertThat(sql.getValue())
            .contains("preticket.status = 'COMPLETED'")
            .contains("preticket.pos_ticket_id = ?")
            .contains("preticket.claimed_by_user_id = ?")
            .contains("preticket.status = 'CLAIMED'")
            .contains("preticket.business_id = ?");
        assertThat(arguments.getValue()).containsExactly(
            91L, 7L, 41L, 13L, 5L, 2L, 3L, 11L, 3L);
    }

    private PosContext context() {
        return new PosContext(
            5L, 7L, "Cashier", "cashier", true, PosScope.businessOffice(2L, 3L));
    }

    private CashRegisterRecord register() {
        var now = Instant.parse("2026-07-18T12:00:00Z");
        return new CashRegisterRecord(
            13L, 7L, 2L, 3L, 11L, "Almacen principal", "POS-01",
            "Caja principal", CashRegisterStatus.ACTIVE, true, null, 5L, 5L,
            now.minusSeconds(60), now.minusSeconds(60), null, 1L, null, null);
    }

    private SelfServiceKioskRepository.KioskRecord kiosk() {
        var now = Instant.parse("2026-07-18T12:00:00Z");
        return new SelfServiceKioskRepository.KioskRecord(
            17L, 7L, "Indice", 2L, "Unidad Norte", 3L, "Negocio Centro",
            11L, "Almacen principal", 13L, "POS-01", "Caja principal",
            "SELF-SERVICE-01", "Autoservicio principal", "ACTIVE", null, "tokenhint",
            true, true, 30, 120, 1L, now.minusSeconds(60), now.minusSeconds(60));
    }
}
