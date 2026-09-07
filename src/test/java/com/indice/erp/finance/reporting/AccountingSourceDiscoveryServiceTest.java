package com.indice.erp.finance.reporting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AccountingSourceDiscoveryServiceTest {

    private static final LocalDate FROM = LocalDate.of(2026, 8, 1);
    private static final LocalDate TO = LocalDate.of(2026, 8, 31);

    private AccountingSourceRepository repository;
    private AccountingSourceDiscoveryService service;

    @BeforeEach
    void setUp() {
        repository = mock(AccountingSourceRepository.class);
        service = new AccountingSourceDiscoveryService(repository, new ObjectMapper(), new AccountingCurrencyConversion(
            mock(com.indice.erp.exchange.BusinessExchangeRateSnapshotRepository.class), mock(org.springframework.jdbc.core.JdbcTemplate.class), new ObjectMapper(), mock(HistoricalInventoryCost.class)));
        when(repository.findSales(1L, FROM, TO)).thenReturn(List.of());
        when(repository.findExpenses(1L, FROM, TO)).thenReturn(List.of());
        when(repository.findExpensePayments(1L, FROM, TO)).thenReturn(List.of());
        when(repository.findReceivablePayments(1L, FROM, TO)).thenReturn(List.of());
        when(repository.findPayrollRuns(1L, FROM, TO)).thenReturn(List.of());
    }

    @Test
    void buildsBalancedSalesEntryFromApprovedSourceEvidence() {
        when(repository.findSales(1L, FROM, TO)).thenReturn(List.of(
            new AccountingSourceRepository.SaleSource(
                7L, "VEN-7", LocalDate.of(2026, 8, 10), new BigDecimal("116.00"),
                new BigDecimal("16.00"), new BigDecimal("40.00"), "MXN", 2L, 3L,
                "[{\"quantity\":2,\"unitCost\":30}]", false)
        ));

        var discovery = service.discover(1L, FROM, TO, "MXN");

        assertThat(discovery.issues()).isEmpty();
        assertThat(discovery.candidates()).singleElement().satisfies(candidate -> {
            assertThat(candidate.sourceEventKey()).isEqualTo("sales:SALE:7");
            assertThat(candidate.lines()).hasSize(5);
            var debit = candidate.lines().stream().map(AccountingPostingModels.PostingLine::debit)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            var credit = candidate.lines().stream().map(AccountingPostingModels.PostingLine::credit)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            assertThat(debit).isEqualByComparingTo(credit);
            assertThat(candidate.lines()).extracting(AccountingPostingModels.PostingLine::systemAccountCode)
                .contains("CASH", "REVENUE", "TAXES_PAYABLE", "COST_OF_SALES", "INVENTORY");
        });
    }

    @Test
    void blocksForeignCurrencyWithoutAnExchangeRateInsteadOfInventingConversion() {
        when(repository.findSales(1L, FROM, TO)).thenReturn(List.of(
            new AccountingSourceRepository.SaleSource(
                8L, "VEN-8", LocalDate.of(2026, 8, 10), new BigDecimal("100.00"),
                BigDecimal.ZERO, BigDecimal.TEN, "USD", null, null,
                "[{\"quantity\":1,\"unitCost\":90}]", false)
        ));

        var discovery = service.discover(1L, FROM, TO, "MXN");

        assertThat(discovery.candidates()).isEmpty();
        assertThat(discovery.issues()).singleElement().satisfies(issue -> {
            assertThat(issue.code()).isEqualTo("MISSING_EXCHANGE_RATE");
            assertThat(issue.severity()).isEqualTo("BLOCKING");
        });
    }

    @Test
    void accruesAndPaysApprovedPayrollWithSeparateIdempotencyKeys() {
        when(repository.findPayrollRuns(1L, FROM, TO)).thenReturn(List.of(
            new AccountingSourceRepository.PayrollSource(
                11L, LocalDate.of(2026, 8, 15), "paid", new BigDecimal("1000"),
                new BigDecimal("200"), new BigDecimal("100"), new BigDecimal("800"),
                LocalDate.of(2026, 8, 16), List.of(new AccountingSourceRepository.PayrollLineSource(
                    1L, null, null, "MXN", new BigDecimal("1000"), new BigDecimal("200"),
                    new BigDecimal("100"), new BigDecimal("800"))))
        ));

        var discovery = service.discover(1L, FROM, TO, "MXN");

        assertThat(discovery.issues()).isEmpty();
        assertThat(discovery.candidates()).extracting(AccountingPostingModels.PostingCandidate::sourceEventKey)
            .containsExactly("payroll:PAYROLL_ACCRUAL:11", "payroll:PAYROLL_PAYMENT:11");
    }
}
