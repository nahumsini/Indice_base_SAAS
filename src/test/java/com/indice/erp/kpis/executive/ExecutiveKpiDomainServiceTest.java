package com.indice.erp.kpis.executive;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.indice.erp.exchange.BusinessExchangeRateMetadataResponse;
import com.indice.erp.exchange.BusinessExchangeRateSourceResponse;
import com.indice.erp.exchange.BusinessExchangeRateService;
import com.indice.erp.exchange.BusinessExchangeRatesResponse;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import com.indice.erp.kpis.currency.KpiMoneyAmount;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

@ExtendWith(MockitoExtension.class)
class ExecutiveKpiDomainServiceTest {

    @Mock
    private ExecutiveKpiDomainRepository repository;

    @Mock
    private BusinessExchangeRateService exchangeRateService;

    private ExecutiveKpiDomainService service;
    private ExecutiveKpiScope scope;
    private ExecutiveKpiScope previous;

    @BeforeEach
    void setUp() {
        var transactionManager = mock(PlatformTransactionManager.class);
        when(transactionManager.getTransaction(any(TransactionDefinition.class)))
                .thenReturn(new SimpleTransactionStatus());
        service = new ExecutiveKpiDomainService(
                repository, new KpiCurrencyAggregationService(), exchangeRateService, transactionManager);
        scope = new ExecutiveKpiScope(1L, LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 16),
                "custom", null, null, "", "all", "MXN", LocalDate.of(2026, 8, 16));
        previous = scope.previousPeriod();

        var metadata = new BusinessExchangeRateMetadataResponse(
                "daily", "official", "2026-08-16", "2026-08-16T12:00:00Z",
                "official-test", "", "", "test rates");
        when(exchangeRateService.loadDailyRates()).thenReturn(new BusinessExchangeRatesResponse(
                "USD", Map.of("USD", BigDecimal.ONE, "MXN", new BigDecimal("17.00")),
                metadata, List.of(new BusinessExchangeRateSourceResponse(
                        "MXN", new BigDecimal("17.00"), "2026-08-16", "official-test",
                        "test", "", "", "official", "")), List.of()));

        when(repository.loadProcesses(scope)).thenReturn(new ExecutiveKpiDomainRepository.ProcessSnapshot(10, 8, 1, 2, 1, 82, 0, 0, 0, 0, 0));
        when(repository.loadProcesses(previous)).thenReturn(new ExecutiveKpiDomainRepository.ProcessSnapshot(8, 4, 2, 1, 0, 60, 0, 0, 0, 0, 0));
        when(repository.loadExpenses(scope)).thenReturn(new ExecutiveKpiDomainRepository.ExpenseSnapshot(4, 1, 2, 1, 1, 0, 0, 0, 0, 0));
        when(repository.loadExpenses(previous)).thenReturn(new ExecutiveKpiDomainRepository.ExpenseSnapshot(3, 0, 1, 0, 0, 0, 0, 0, 0, 0));
        when(repository.loadPettyCash(scope)).thenReturn(new ExecutiveKpiDomainRepository.PettyCashSnapshot(2, 1, 4, 2, 1, 0, 0, 0, 0));
        when(repository.loadInventory(scope)).thenReturn(new ExecutiveKpiDomainRepository.InventorySnapshot(20, 20, 2, 3, 70, 30, 12, 1, 2, 0, 0));
        when(repository.loadInventory(previous)).thenReturn(new ExecutiveKpiDomainRepository.InventorySnapshot(20, 20, 1, 2, 75, 25, 8, 0, 1, 0, 0));
        when(repository.loadSales(scope)).thenReturn(new ExecutiveKpiDomainRepository.SalesSnapshot(3, 1, 1, 4, 3, 0, 0, 0, 0, 0, 0, 0));
        when(repository.loadSales(previous)).thenReturn(new ExecutiveKpiDomainRepository.SalesSnapshot(2, 0, 0, 4, 2, 0, 0, 0, 0, 0, 0, 0));
        when(repository.loadSalesCountByCurrency(scope)).thenReturn(List.of(
                new ExecutiveKpiDomainRepository.CurrencyCount("USD", 1),
                new ExecutiveKpiDomainRepository.CurrencyCount("MXN", 2)));
        when(repository.loadSalesCountByCurrency(previous)).thenReturn(List.of(
                new ExecutiveKpiDomainRepository.CurrencyCount("MXN", 2)));

        when(repository.loadExpenseValue(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyBoolean())).thenReturn(List.of());
        when(repository.loadBudgetValue(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString())).thenReturn(List.of());
        when(repository.loadBudgetQuality(org.mockito.ArgumentMatchers.any()))
                .thenReturn(new ExecutiveKpiDomainRepository.BudgetSnapshot(0, 0));
        when(repository.loadPettyCashValue(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString())).thenReturn(List.of());
        when(repository.loadPettyCashSettlements(org.mockito.ArgumentMatchers.any())).thenReturn(List.of());
        when(repository.loadInventoryValue(org.mockito.ArgumentMatchers.any())).thenReturn(List.of());
        when(repository.loadPipelineValue(org.mockito.ArgumentMatchers.any())).thenReturn(List.of());
    }

    @Test
    void buildsVersionedDomainsWithComparableOperationalMetricsAndConvertedSales() {
        when(repository.loadSalesValue(scope)).thenReturn(List.of(
                new KpiMoneyAmount(new BigDecimal("100.00"), "USD"),
                new KpiMoneyAmount(new BigDecimal("1700.00"), "MXN")));
        when(repository.loadSalesValue(previous)).thenReturn(List.of(
                new KpiMoneyAmount(new BigDecimal("1000.00"), "MXN")));

        var result = service.build(scope);

        assertThat(result.contractVersion()).isEqualTo("2.1");
        assertThat(result.items()).extracting(ExecutiveKpiDomainContracts.Domain::id)
                .containsExactly("processTasks", "expenses", "pettyCash", "inventory", "sales");
        assertThat(metric(result, "processTasks", "completionRate").value()).isEqualByComparingTo("80.00");
        assertThat(metric(result, "processTasks", "completionRate").previousValue()).isEqualByComparingTo("50.00");
        assertThat(metric(result, "sales", "netSales").value()).isEqualByComparingTo("3400.00");
        assertThat(metric(result, "sales", "netSales").previousValue()).isEqualByComparingTo("1000.00");
        assertThat(metric(result, "inventory", "reservedRate").value()).isEqualByComparingTo("30.00");
        assertThat(result.dataQuality().partial()).isFalse();
        assertThat(result.dataQuality().decisionReady()).isTrue();
    }

    @Test
    void reportsPartialCurrencyCoverageInsteadOfSilentlyAddingUnknownCurrencies() {
        when(repository.loadSalesValue(scope)).thenReturn(List.of(
                new KpiMoneyAmount(new BigDecimal("100.00"), "USD"),
                new KpiMoneyAmount(new BigDecimal("50.00"), "CAD")));
        when(repository.loadSalesValue(previous)).thenReturn(List.of());

        var result = service.build(scope);

        assertThat(metric(result, "sales", "netSales").value()).isEqualByComparingTo("1700.00");
        assertThat(metric(result, "sales", "netSales").partial()).isTrue();
        assertThat(metric(result, "sales", "netSales").available()).isFalse();
        assertThat(metric(result, "sales", "netSales").excludedCurrencies()).containsExactly("CAD");
        assertThat(result.dataQuality().partial()).isTrue();
        assertThat(result.dataQuality().decisionReady()).isFalse();
        assertThat(result.dataQuality().excludedCurrencies()).containsExactly("CAD");
    }

    @Test
    void marksAffectedMetricsUnavailableWhenSourceRowsAreStructurallyInvalid() {
        when(repository.loadSales(scope)).thenReturn(new ExecutiveKpiDomainRepository.SalesSnapshot(
                3, 1, 1, 4, 3, 0, 1, 0, 0, 0, 0, 0));
        when(repository.loadSalesValue(scope)).thenReturn(List.of(
                new KpiMoneyAmount(new BigDecimal("1700.00"), "MXN")));
        when(repository.loadSalesValue(previous)).thenReturn(List.of());

        var result = service.build(scope);
        var salesDomain = result.items().stream().filter(domain -> domain.id().equals("sales")).findFirst().orElseThrow();

        assertThat(metric(result, "sales", "netSales").available()).isFalse();
        assertThat(salesDomain.dataQuality().decisionReady()).isFalse();
        assertThat(salesDomain.dataQuality().issues()).anyMatch(issue -> issue.contains("importes negativos"));
        assertThat(result.dataQuality().decisionReady()).isFalse();
    }

    @Test
    void rejectsFallbackExchangeEvidenceForConvertedMetrics() {
        var metadata = new BusinessExchangeRateMetadataResponse(
                "daily", "fallback", "2026-08-16", "2026-08-16T12:00:00Z",
                "fallback-test", "", "", "fallback rates");
        when(exchangeRateService.loadDailyRates()).thenReturn(new BusinessExchangeRatesResponse(
                "USD", Map.of("USD", BigDecimal.ONE, "MXN", new BigDecimal("17.00")), metadata,
                List.of(new BusinessExchangeRateSourceResponse(
                        "MXN", new BigDecimal("17.00"), "2026-08-16", "fallback-test",
                        "test", "", "", "fallback", "not official")), List.of("fallback")));
        when(repository.loadSalesValue(scope)).thenReturn(List.of(
                new KpiMoneyAmount(new BigDecimal("100.00"), "USD")));
        when(repository.loadSalesValue(previous)).thenReturn(List.of());

        var result = service.build(scope);

        assertThat(result.dataQuality().decisionReady()).isFalse();
        assertThat(result.dataQuality().issues()).anyMatch(issue -> issue.contains("Tasas no oficiales"));
    }

    private ExecutiveKpiDomainContracts.Metric metric(
            ExecutiveKpiDomainContracts.Dashboard dashboard,
            String domainId,
            String metricId) {
        return dashboard.items().stream()
                .filter(domain -> domain.id().equals(domainId))
                .flatMap(domain -> domain.metrics().stream())
                .filter(metric -> metric.id().equals(metricId))
                .findFirst()
                .orElseThrow();
    }
}
