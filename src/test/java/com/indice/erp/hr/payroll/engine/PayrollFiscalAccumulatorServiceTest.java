package com.indice.erp.hr.payroll.engine;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class PayrollFiscalAccumulatorServiceTest {

    @Test
    void loadSnapshotBuildsReplayableAccumulatorFromPriorProcessedApprovedAndPaidRuns() {
        var jdbcTemplate = new FakeAccumulatorJdbcTemplate()
            .withTotals("10000.00", "1500.00", "2200.00", "8500.00")
            .withTaxableHistory("9800.00", "300.00")
            .withItemHistory(List.of(
                new ItemHistory("us_ss_emp", "deduction", bd("620.00")),
                new ItemHistory("employer_us_ss", "employer_contribution", bd("620.00")),
                new ItemHistory("vacation_provision", "provision", bd("400.00"))
            ));
        var service = new PayrollFiscalAccumulatorService(jdbcTemplate);

        var snapshot = service.loadSnapshot(
            1L,
            20L,
            "us",
            LocalDate.parse("2026-06-15"),
            LocalDate.parse("2026-06-30"),
            77L
        );

        assertEquals("US", snapshot.countryCode());
        assertEquals(2026, snapshot.fiscalYear());
        assertEquals(LocalDate.parse("2026-01-01"), snapshot.yearStartDate());
        assertEquals(0, bd("10000.00").compareTo(snapshot.grossAmountYearToDate()));
        assertEquals(0, bd("9500.00").compareTo(snapshot.taxableBaseYearToDate()));
        assertEquals(0, bd("1500.00").compareTo(snapshot.employeeDeductionsYearToDate()));
        assertEquals(0, bd("2200.00").compareTo(snapshot.employerContributionsYearToDate()));
        assertEquals(0, bd("8500.00").compareTo(snapshot.netAmountYearToDate()));
        assertEquals(0, bd("620.00").compareTo(snapshot.employeeDeductionAmount("US_SS_EMP")));
        assertEquals(0, bd("620.00").compareTo(snapshot.employerContributionAmount("EMPLOYER_US_SS")));
        assertEquals(0, bd("400.00").compareTo(snapshot.employerContributionAmount("VACATION_PROVISION")));
        assertEquals("payroll_run_lines", snapshot.metadata().get("source"));
        assertTrue(String.valueOf(snapshot.metadata().get("includedStatuses")).contains("processed"));
        assertTrue(String.valueOf(snapshot.metadata().get("includedStatuses")).contains("approved"));
        assertTrue(String.valueOf(snapshot.metadata().get("includedStatuses")).contains("paid"));
        assertEquals(Boolean.TRUE, snapshot.metadata().get("currentRunExcluded"));
        assertEquals(77L, snapshot.metadata().get("currentRunId"));
        assertEquals("2026-06-15", snapshot.metadata().get("cutoffDate"));
        assertEquals("taxable_earning_items_minus_absence_deductions", snapshot.metadata().get("taxableBaseSource"));

        assertEquals(3, jdbcTemplate.queries.size());
        for (var query : jdbcTemplate.queries) {
            assertTrue(query.contains("r.status IN ('processed', 'approved', 'paid')"));
            assertTrue(query.contains("l.include_in_fiscal = 1"));
            assertTrue(query.contains("(? IS NULL OR l.run_id <> ?)"));
        }
        assertCapturedArgs(jdbcTemplate.arguments.get(0));
        assertCapturedArgs(jdbcTemplate.arguments.get(1));
        assertCapturedArgs(jdbcTemplate.arguments.get(2));
    }

    @Test
    void loadSnapshotFallsBackToGrossWhenTaxableItemHistoryIsUnavailable() {
        var jdbcTemplate = new FakeAccumulatorJdbcTemplate()
            .withTotals("5000.00", "750.00", "900.00", "4250.00")
            .withTaxableHistory("0.00", "0.00");
        var service = new PayrollFiscalAccumulatorService(jdbcTemplate);

        var snapshot = service.loadSnapshot(
            1L,
            20L,
            "mx",
            LocalDate.parse("2026-02-01"),
            LocalDate.parse("2026-02-15"),
            null
        );

        assertEquals("MX", snapshot.countryCode());
        assertEquals(0, bd("5000.00").compareTo(snapshot.taxableBaseYearToDate()));
        assertEquals("gross_amount_fallback", snapshot.metadata().get("taxableBaseSource"));
        assertEquals(Boolean.FALSE, snapshot.metadata().get("currentRunExcluded"));
    }

    private void assertCapturedArgs(Object[] args) {
        assertArrayEquals(new Object[] {
            1L,
            20L,
            "US",
            LocalDate.parse("2026-01-01"),
            LocalDate.parse("2026-06-15"),
            77L,
            77L
        }, args);
    }

    private static BigDecimal bd(String value) {
        return new BigDecimal(value);
    }

    private static final class FakeAccumulatorJdbcTemplate extends JdbcTemplate {

        private final List<String> queries = new ArrayList<>();
        private final List<Object[]> arguments = new ArrayList<>();
        private Totals totals = new Totals(bd("0.00"), bd("0.00"), bd("0.00"), bd("0.00"));
        private TaxableHistory taxableHistory = new TaxableHistory(bd("0.00"), bd("0.00"));
        private List<ItemHistory> itemHistory = List.of();

        private FakeAccumulatorJdbcTemplate withTotals(String gross, String deductions, String employer, String net) {
            totals = new Totals(bd(gross), bd(deductions), bd(employer), bd(net));
            return this;
        }

        private FakeAccumulatorJdbcTemplate withTaxableHistory(String taxableEarnings, String absenceDeductions) {
            taxableHistory = new TaxableHistory(bd(taxableEarnings), bd(absenceDeductions));
            return this;
        }

        private FakeAccumulatorJdbcTemplate withItemHistory(List<ItemHistory> rows) {
            itemHistory = rows;
            return this;
        }

        @Override
        public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
            queries.add(sql);
            arguments.add(args);
            try {
                if (sql.contains("SUM(l.gross_amount)")) {
                    return List.of(rowMapper.mapRow(totalsResultSet(), 0));
                }
                if (sql.contains("taxable_earnings")) {
                    return List.of(rowMapper.mapRow(taxableResultSet(), 0));
                }
                if (sql.contains("GROUP BY COALESCE(i.code")) {
                    var rows = new ArrayList<T>();
                    for (var index = 0; index < itemHistory.size(); index++) {
                        rows.add(rowMapper.mapRow(itemResultSet(itemHistory.get(index)), index));
                    }
                    return rows;
                }
            } catch (SQLException exception) {
                throw new AssertionError(exception);
            }
            throw new AssertionError("Unexpected accumulator query: " + sql);
        }

        private ResultSet totalsResultSet() throws SQLException {
            var resultSet = mock(ResultSet.class);
            when(resultSet.getBigDecimal("gross_amount")).thenReturn(totals.grossAmount());
            when(resultSet.getBigDecimal("deductions_amount")).thenReturn(totals.deductionsAmount());
            when(resultSet.getBigDecimal("employer_contributions_amount")).thenReturn(totals.employerContributionsAmount());
            when(resultSet.getBigDecimal("net_amount")).thenReturn(totals.netAmount());
            return resultSet;
        }

        private ResultSet taxableResultSet() throws SQLException {
            var resultSet = mock(ResultSet.class);
            when(resultSet.getBigDecimal("taxable_earnings")).thenReturn(taxableHistory.taxableEarnings());
            when(resultSet.getBigDecimal("absence_deductions")).thenReturn(taxableHistory.absenceDeductions());
            return resultSet;
        }

        private ResultSet itemResultSet(ItemHistory item) throws SQLException {
            var resultSet = mock(ResultSet.class);
            when(resultSet.getString("code")).thenReturn(item.code());
            when(resultSet.getString("category")).thenReturn(item.category());
            when(resultSet.getBigDecimal("amount")).thenReturn(item.amount());
            return resultSet;
        }
    }

    private record Totals(
        BigDecimal grossAmount,
        BigDecimal deductionsAmount,
        BigDecimal employerContributionsAmount,
        BigDecimal netAmount
    ) {
    }

    private record TaxableHistory(BigDecimal taxableEarnings, BigDecimal absenceDeductions) {
    }

    private record ItemHistory(String code, String category, BigDecimal amount) {
    }
}
