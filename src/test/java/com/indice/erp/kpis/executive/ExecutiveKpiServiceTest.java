package com.indice.erp.kpis.executive;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.time.ZoneId;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.exchange.BusinessExchangeRateService;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ExecutiveKpiServiceTest {

    private ExecutiveKpiRepository repository;
    private ExecutiveKpiService service;

    @BeforeEach
    void setUp() {
        repository = mock(ExecutiveKpiRepository.class);
        var timeZones = mock(FinanceBusinessTimeZoneResolver.class);
        when(timeZones.resolve(org.mockito.ArgumentMatchers.anyLong())).thenReturn(ZoneId.of("America/Toronto"));
        service = new ExecutiveKpiService(
                repository,
                mock(ExecutiveKpiDomainService.class),
                mock(ExecutiveDecisionMatrixService.class), mock(BusinessExchangeRateService.class),
                new KpiCurrencyAggregationService(), timeZones, mock(org.springframework.transaction.PlatformTransactionManager.class),
                mock(com.indice.erp.finance.reporting.FinancialPerformanceProjectionService.class));
    }

    @Test
    void rejectsUnknownFiltersInsteadOfBroadeningTheCompanyScope() {
        assertThatThrownBy(() -> service.getExecutivePanel(1L, 7L, Map.of("unitId", "not-a-number")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("positive integers");
        assertThatThrownBy(() -> service.getExecutivePanel(1L, 7L, Map.of("risk", "urgent")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("risk must be");
        assertThatThrownBy(() -> service.getExecutivePanel(1L, 7L, Map.of("preferredCurrency", "pesos")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("three-letter ISO code");
    }

    @Test
    void rejectsAUnitOrBusinessOutsideTheAuthenticatedCompany() {
        when(repository.scopeExists(any())).thenReturn(false);

        assertThatThrownBy(() -> service.getExecutivePanel(1L, 7L, Map.of("unitId", "999")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not belong to this company");
    }

    @Test
    void returnsOnlyThePermittedOrganizationCatalogWithAVersionedContract() {
        var rows = List.<Map<String, Object>>of(Map.of(
                "unitId", 2L, "unitName", "North", "businessId", 3L, "businessName", "Retail"));
        when(repository.scopeExists(any())).thenReturn(true);
        when(repository.loadOrganizationRows(any())).thenReturn(rows);

        var result = service.getOrganizationOptions(1L, 2L, 3L);

        assertThat(result.get("contractVersion")).isEqualTo("organization-options/1.0");
        assertThat(result.get("items")).isEqualTo(rows);
        var scope = org.mockito.ArgumentCaptor.forClass(ExecutiveKpiScope.class);
        verify(repository).loadOrganizationRows(scope.capture());
        assertThat(scope.getValue().companyId()).isEqualTo(1L);
        assertThat(scope.getValue().unitId()).isEqualTo(2L);
        assertThat(scope.getValue().businessId()).isEqualTo(3L);
    }

    @Test
    void rejectsAnOrganizationCatalogOutsideThePermittedScope() {
        when(repository.scopeExists(any())).thenReturn(false);

        assertThatThrownBy(() -> service.getOrganizationOptions(1L, 999L, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("permitted organization scope");
    }
}
