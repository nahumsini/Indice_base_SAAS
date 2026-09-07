package com.indice.erp.sales;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.exchange.*;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.kpis.currency.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@Transactional
class SalesCommissionSummaryIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired FinanceBusinessTimeZoneResolver timezones;
    @Autowired BasicModuleKpiCurrencyRepository central;
    final KpiCurrencyAggregationService aggregation = new KpiCurrencyAggregationService();
    SalesCommissionSummaryService service;
    long company;
    Map<String, BigDecimal> rates = Map.of("USD", BigDecimal.ONE, "MXN", new BigDecimal("20"));
    @BeforeEach void setup() {
        var name = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", name);
        company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, name);
        var exchange = mock(BusinessExchangeRateService.class);
        var today = LocalDate.now(timezones.resolve(company));
        when(exchange.loadDailyRates()).thenReturn(new BusinessExchangeRatesResponse("USD", rates,
            new BusinessExchangeRateMetadataResponse("daily", "test", today.toString(), "", "Verified test", "", "", ""),
            List.of(new BusinessExchangeRateSourceResponse("MXN", new BigDecimal("20"), today.toString(), "test", "test", "", "", "official", "")), List.of()));
        service = new SalesCommissionSummaryService(jdbc, mapper, exchange, aggregation, timezones);
    }
    @Test void convertsBeforeSummingAndCountsEachSaleOnceIncludingDuplicateSelections() {
        long usd = sale("USD", "100", "10", "calculated", "approved", "[{\"commissionAmount\":\"4\"},{\"commissionAmount\":6}]");
        long mxn = sale("MXN", "100", "10", "paid", "approved", "[]");
        long cancelled = sale("USD", "900", "90", "calculated", "cancelled", "[]");
        var selected = List.of(selection(usd, 0, 1), selection(usd, 1), selection(mxn, 0), selection(cancelled, 0));
        var result = service.summarize(company, HrOperationalScope.corporateOffice(), query("USD", selected));
        assertThat(result.total().preferredTotal()).isEqualByComparingTo("10.50");
        assertThat(result.approved().preferredTotal()).isEqualByComparingTo("10");
        assertThat(result.paid().preferredTotal()).isEqualByComparingTo("0.50");
        assertThat(result.salesBase().preferredTotal()).isEqualByComparingTo("105");
        assertThat(result.commissionRate()).isEqualByComparingTo("10");
        assertThat(result.incomplete()).isFalse();
        var centralTotal = aggregation.aggregate(central.load(BasicModuleKpiMetric.SALES_COMMISSION, company, null, null,
            List.of(usd,mxn,cancelled),true), "USD", rates, "daily", LocalDate.now(), "test");
        assertThat(result.total().preferredTotal()).isEqualByComparingTo(centralTotal.preferredTotal());
        var converted = service.summarize(company, HrOperationalScope.corporateOffice(), query("MXN", selected));
        assertThat(converted.total().preferredTotal()).isEqualByComparingTo("210");
        assertThat(converted.commissionRate()).isEqualByComparingTo("10");
        assertThat(jdbc.queryForObject("SELECT total_amount FROM sales_records WHERE company_id=? AND id=?", BigDecimal.class, company, usd)).isEqualByComparingTo("100");
    }
    @Test void productSelectionUsesOnlyItsCommissionAndOneSaleDenominator() {
        long id = sale("USD", "100", "10", "pending", "approved", "[{\"commissionAmount\":4},{\"commissionAmount\":6}]");
        var result = service.summarize(company, HrOperationalScope.corporateOffice(), query("USD", List.of(selection(id,1))));
        assertThat(result.total().preferredTotal()).isEqualByComparingTo("6");
        assertThat(result.commissionRate()).isEqualByComparingTo("6");
        assertThatThrownBy(() -> service.summarize(company, HrOperationalScope.corporateOffice(), query("USD", List.of(selection(id,2)))))
            .isInstanceOf(IllegalArgumentException.class);
    }
    @Test void missingExchangeRateRetainsNativeAmountsAndWithholdsTheRate() {
        long id = sale("CAD", "100", "10", "pending", "approved", "[]");
        var result = service.summarize(company, HrOperationalScope.corporateOffice(), query("USD", List.of(selection(id,0))));
        assertThat(result.total().partial()).isTrue();
        assertThat(result.total().nativeTotals()).containsExactly(new KpiNativeCurrencyTotal("CAD", new BigDecimal("10.00")));
        assertThat(result.commissionRate()).isNull();
    }
    @Test void foreignCompanyAndUnassignedScopesCannotReadSelectedSales() {
        long id = sale("USD", "100", "10", "paid", "approved", "[]");
        var query = query("USD", List.of(selection(id,0)));
        assertThatThrownBy(() -> service.summarize(company+100000, HrOperationalScope.corporateOffice(), query)).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(() -> service.summarize(company, HrOperationalScope.unassigned(), query)).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(() -> service.summarize(company, HrOperationalScope.businessOffice(null,999999L), query)).isInstanceOf(NoSuchElementException.class);
    }
    @Test void inconsistentAndMalformedHistoricalSnapshotsDoNotProduceAFalseRate() {
        long id = sale("USD", "100", "10", "pending", "approved", "[{\"commissionAmount\":7}]");
        assertThat(service.summarize(company, HrOperationalScope.corporateOffice(), query("USD",List.of(selection(id,0)))).incomplete()).isTrue();
        long invalid = sale("USD", "100", "10", "pending", "approved", "[{\"commissionAmount\":\"invalid\"}]");
        assertThatThrownBy(() -> service.summarize(company, HrOperationalScope.corporateOffice(), query("USD",List.of(selection(invalid,0)))))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("incomplete");
    }
    private SalesCommissionSummaryService.Query query(String currency, List<SalesCommissionSummaryService.Selection> selections) {
        return new SalesCommissionSummaryService.Query(currency,selections);
    }
    private SalesCommissionSummaryService.Selection selection(long id, Integer... indices) {
        return new SalesCommissionSummaryService.Selection(id,List.of(indices));
    }
    private long sale(String currency, String total, String commission, String status, String commercial, String breakdown) {
        String number=UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO sales_records(company_id,sale_number,customer_name,sale_date,currency,total_amount,commission_amount,
                commission_status,commercial_status,commission_breakdown_json)
            VALUES(?,?,'Synthetic customer',CURRENT_DATE,?,?,?,?,?,?)
            """,company,number,currency,new BigDecimal(total),new BigDecimal(commission),status,commercial,breakdown);
        return jdbc.queryForObject("SELECT id FROM sales_records WHERE company_id=? AND sale_number=?",Long.class,company,number);
    }
}
