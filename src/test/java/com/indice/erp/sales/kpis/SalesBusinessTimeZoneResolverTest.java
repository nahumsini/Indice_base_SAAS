package com.indice.erp.sales.kpis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class SalesBusinessTimeZoneResolverTest {

    private final SalesKpiTodayRepository repository = mock(SalesKpiTodayRepository.class);
    private final SalesBusinessTimeZoneResolver resolver = new SalesBusinessTimeZoneResolver(
        repository,
        new ObjectMapper(),
        "America/Toronto"
    );

    @Test
    void prefersExplicitCompanyTimezone() {
        given(repository.companySettingsJson(7L)).willReturn(Optional.of("""
            {"config_center":{"empresa_template":{"timezone":"America/Mexico_City"}}}
            """));

        assertThat(resolver.resolve(7L).getId()).isEqualTo("America/Mexico_City");
    }

    @Test
    void supportsSingleLegacyMapTimezone() {
        given(repository.companySettingsJson(7L)).willReturn(Optional.of("""
            {"config_center":{"map":[{"timezone":"America/Cancun"}]}}
            """));

        assertThat(resolver.resolve(7L).getId()).isEqualTo("America/Cancun");
    }

    @Test
    void usesSingleOperationalTimezoneWhenCompanyTimezoneIsMissing() {
        given(repository.companySettingsJson(7L)).willReturn(Optional.empty());
        given(repository.operationalTimezones(7L)).willReturn(List.of("America/Monterrey", "America/Monterrey"));

        assertThat(resolver.resolve(7L).getId()).isEqualTo("America/Monterrey");
    }

    @Test
    void usesDocumentedFallbackWhenOperationalTimezonesConflict() {
        given(repository.companySettingsJson(7L)).willReturn(Optional.empty());
        given(repository.operationalTimezones(7L)).willReturn(List.of("America/Cancun", "America/Toronto"));

        assertThat(resolver.resolve(7L).getId()).isEqualTo("America/Toronto");
    }

    @Test
    void rejectsInvalidConfiguredTimezoneInsteadOfUsingServerTimezone() {
        given(repository.companySettingsJson(7L)).willReturn(Optional.of("""
            {"config_center":{"empresa_template":{"timezone":"not-a-zone"}}}
            """));

        assertThatThrownBy(() -> resolver.resolve(7L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("company timezone");
    }
}
