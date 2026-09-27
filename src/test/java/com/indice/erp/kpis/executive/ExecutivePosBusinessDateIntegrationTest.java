package com.indice.erp.kpis.executive;

import static org.assertj.core.api.Assertions.assertThat;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.kpis.currency.*;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({ExecutiveKpiDomainRepository.class, BasicModuleKpiCurrencyRepository.class,
    FinanceBusinessTimeZoneResolver.class, ObjectMapper.class})
class ExecutivePosBusinessDateIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ExecutiveKpiDomainRepository executive;
    @Autowired BasicModuleKpiCurrencyRepository basic;
    @Autowired FinanceBusinessTimeZoneResolver timeZones;

    @ParameterizedTest
    @CsvSource({"America/Mexico_City,2026-08-31", "America/Toronto,2026-03-08", "America/Toronto,2026-11-01"})
    void centralAndLocalPosKpisUseTheSameBusinessDayIncludingDst(String timezone, LocalDate day) {
        assertThat(jdbc.queryForObject("SELECT DATABASE()", String.class)).isEqualTo("indice_test_db");
        String key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", key);
        long company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, key);
        long user = jdbc.queryForObject("SELECT MIN(id) FROM users", Long.class);
        jdbc.update("INSERT INTO company_settings (company_id, settings_json) VALUES (?, JSON_OBJECT('config_center', JSON_OBJECT('empresa_template', JSON_OBJECT('timezone', ?))))", company, timezone);
        jdbc.update("INSERT INTO sales_inventory_warehouses (company_id, warehouse_code, name, type, status) VALUES (?, ?, 'Synthetic warehouse', 'main', 'active')", company, key);
        long warehouse = jdbc.queryForObject("SELECT id FROM sales_inventory_warehouses WHERE company_id = ?", Long.class, company);
        jdbc.update("INSERT INTO pos_cash_registers (company_id, warehouse_id, code, name, status, created_by_user_id) VALUES (?, ?, ?, 'Synthetic register', 'ACTIVE', ?)", company, warehouse, key, user);
        long register = jdbc.queryForObject("SELECT id FROM pos_cash_registers WHERE company_id = ?", Long.class, company);
        jdbc.update("INSERT INTO pos_shifts (company_id, warehouse_id, cash_register_id, opened_by_user_id, created_by_user_id, status, currency_code) VALUES (?, ?, ?, ?, ?, 'CLOSED', 'MXN')", company, warehouse, register, user, user);
        long shift = jdbc.queryForObject("SELECT id FROM pos_shifts WHERE company_id = ?", Long.class, company);
        jdbc.update("""
            INSERT INTO pos_cash_closings (company_id, warehouse_id, cash_register_id, shift_id,
                opening_cash_amount, cash_sales_amount, cash_in_amount, cash_out_amount, safe_drop_amount,
                correction_amount, expected_cash_amount, counted_cash_amount, over_short_amount,
                total_sales_amount, total_refunds_amount, tickets_count, closed_by_user_id)
            VALUES (?, ?, ?, ?, 0, 50, 0, 0, 0, 0, 50, 50, 0, 50, 10, 2, ?)
            """, company, warehouse, register, shift, user);
        var zone = ZoneId.of(timezone);
        assertThat(timeZones.resolve(company)).isEqualTo(zone);
        var start = day.atStartOfDay(zone).toInstant();
        var end = day.plusDays(1).atStartOfDay(zone).toInstant();
        var scope = new ExecutiveKpiScope(company, day, day, "custom", null, null, "", "all", "MXN", day);
        for (var moment : List.of(start.minusSeconds(1), start, end.minusSeconds(1), end)) {
            boolean included = !moment.isBefore(start) && moment.isBefore(end);
            jdbc.update("UPDATE pos_cash_closings SET closed_at = ? WHERE company_id = ?", Timestamp.from(moment), company);
            var local = basic.load(BasicModuleKpiMetric.POS_CLOSING_TOTAL, company, day, day, List.of(), false, day, zone);
            var central = executive.loadPointOfSaleValue(scope, "totalSales");
            assertThat(total(central)).as("Central vs local POS at %s in %s", moment, timezone)
                .isEqualByComparingTo(total(local)).isEqualByComparingTo(included ? "50" : "0");
            assertThat(executive.loadPointOfSale(scope).closingCount()).isEqualTo(included ? 1 : 0);
            assertThat(executive.loadPointOfSale(scope).ticketCount()).isEqualTo(included ? 2 : 0);
            assertThat(executive.loadPointOfSaleTicketCountByCurrency(scope).stream()
                .mapToInt(ExecutiveKpiDomainRepository.CurrencyCount::count).sum()).isEqualTo(included ? 2 : 0);
            assertThat(total(executive.loadPointOfSaleValue(scope, "refunds"))).isEqualByComparingTo(included ? "10" : "0");
        }
    }

    private static BigDecimal total(List<KpiMoneyAmount> amounts) {
        return amounts.stream().map(KpiMoneyAmount::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
