package com.indice.erp.finance.reporting;

import static org.assertj.core.api.Assertions.assertThat;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.shared.FinanceCompanyCountryResolver;
import org.junit.jupiter.api.Test;

class FinancialPresentationProfileTest {
    @Test
    void countryComesFromCompanyAddressAndNeverCurrencyOrLanguage() throws Exception {
        var mapper = new ObjectMapper();
        assertThat(FinanceCompanyCountryResolver.fromSettings(mapper.readTree("""
            {"config_center":{"empresa_template":{"currency":"USD","language":"es-MX","address":{"country":"Brasil"}}}}
            """))).isEqualTo("BR");
        assertThat(FinanceCompanyCountryResolver.fromSettings(mapper.readTree("""
            {"config_center":{"empresa_template":{"currency":"MXN","language":"es-MX"}}}
            """))).isEmpty();
        assertThat(FinanceCompanyCountryResolver.fromSettings(mapper.readTree("""
            {"config_center":{"empresa_template":{"currency":"CAD"},"map":[{"is_corporate_office":true,"pais":"Colombia"}]}}
            """))).isEqualTo("CO");
    }
    @Test
    void eachLaunchCountryKeepsItsTaxNamesAndGenericPreparationNotes() {
        assertThat(new FinancialPresentationProfile("MX", "IFRS_SMES_2015").incomeTax()).contains("ISR");
        assertThat(new FinancialPresentationProfile("CA", "IFRS_SMES_2015").indirectTaxNames()).contains("GST", "HST", "PST", "QST");
        assertThat(new FinancialPresentationProfile("US", "IFRS_SMES_2015").indirectTaxNames()).contains("sales tax", "use tax");
        assertThat(new FinancialPresentationProfile("CO", "IFRS_SMES_2015").incomeTax()).contains("renta");
        var brazil = new FinancialPresentationProfile("BR", "IFRS_SMES_2025");
        assertThat(brazil.incomeTax()).contains("IRPJ", "CSLL");
        assertThat(brazil.indirectTaxNames()).contains("CBS", "IBS", "vigencia");
        assertThat(brazil.notes()).anyMatch(note -> note.contains("no reclasifican saldos históricos"));
    }
}
