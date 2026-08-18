package com.indice.erp.kpis.executive;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ExecutiveKpiServiceTest {

    private ExecutiveKpiRepository repository;
    private ExecutiveKpiService service;

    @BeforeEach
    void setUp() {
        repository = mock(ExecutiveKpiRepository.class);
        service = new ExecutiveKpiService(repository, mock(ExecutiveKpiDomainService.class));
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
        when(repository.scopeExists(org.mockito.ArgumentMatchers.any())).thenReturn(false);

        assertThatThrownBy(() -> service.getExecutivePanel(1L, 7L, Map.of("unitId", "999")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not belong to this company");
    }
}
