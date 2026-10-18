package com.indice.erp.salesboard;

import com.indice.erp.kpis.currency.*;
import com.indice.erp.sales.reporting.SalesReportingContracts.NativeDay;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class SalesBoardAnalyticsTest {
    final KpiCurrencyAggregationService money=new KpiCurrencyAggregationService();
    KpiMonetaryAggregate aggregate(List<NativeDay> rows) { return money.aggregate(rows.stream().map(row->new KpiMoneyAmount(row.total(),row.currency())).toList(),"MXN",Map.of(),"daily",null,""); }
    SalesBoardContracts.Summary summary() { var zero=aggregate(List.of()); return new SalesBoardContracts.Summary(0,0,0,zero,zero,zero,null); }
    @Test void weeklyBucketsRespectMondayBoundariesAndEqualLengthPriorIntervals() {
        var result=SalesBoardAnalytics.build(LocalDate.parse("2026-10-01"),LocalDate.parse("2026-10-14"),"week",List.of(),summary(),this::aggregate);
        assertThat(result.trend()).hasSize(3);
        assertThat(result.trend().getFirst().to()).isEqualTo("2026-10-04");
        assertThat(result.trend().get(1).from()).isEqualTo("2026-10-05");
        assertThat(result.trend().getLast().to()).isEqualTo("2026-10-14");
        assertThat(result.trend()).allSatisfy(point->{
            assertThat(java.time.temporal.ChronoUnit.DAYS.between(point.previousFrom(),point.previousTo())).isEqualTo(java.time.temporal.ChronoUnit.DAYS.between(point.from(),point.to()));
            assertThat(point.total().preferredTotal()).isZero();
        });
    }
    @Test void monthlyBucketsKeepLeapDayAndPartialMonthBoundaries() {
        var result=SalesBoardAnalytics.build(LocalDate.parse("2024-02-15"),LocalDate.parse("2024-03-03"),"month",List.of(),summary(),this::aggregate);
        assertThat(result.trend()).hasSize(2);assertThat(result.trend().getFirst().to()).isEqualTo("2024-02-29");
        assertThat(result.trend().getLast().from()).isEqualTo("2024-03-01");
        assertThat(result.comparison().from()).isEqualTo("2024-01-28");
        assertThat(result.weekdays().stream().mapToLong(SalesBoardContracts.Weekday::occurrences).sum()).isEqualTo(18);
    }
    @Test void missingWeekdaysAreUnknownAveragesAndMissingRatesAreGaps() {
        var rows=List.of(new NativeDay(LocalDate.parse("2026-10-01"),"ZZZ",1,BigDecimal.TEN));
        var result=SalesBoardAnalytics.build(LocalDate.parse("2026-10-01"),LocalDate.parse("2026-10-01"),"day",rows,summary(),this::aggregate);
        assertThat(result.weekdays().getFirst().occurrences()).isZero();assertThat(result.weekdays().getFirst().averagePerDay()).isNull();
        assertThat(result.weekdays().get(3).averagePerDay()).isNull();assertThat(result.trend().getFirst().total().partial()).isTrue();
    }
    @Test void autoGranularityBoundsLongRangeCharts() {
        assertThat(SalesBoardAnalytics.build(LocalDate.parse("2026-01-01"),LocalDate.parse("2026-06-01"),"auto",List.of(),summary(),this::aggregate).granularity()).isEqualTo("week");
        assertThat(SalesBoardAnalytics.build(LocalDate.parse("2024-01-01"),LocalDate.parse("2026-06-01"),"auto",List.of(),summary(),this::aggregate).granularity()).isEqualTo("month");
    }
    @Test void growthTreatsMissingOrZeroBaselineAsUndefined() {
        assertThat(SalesBoardAnalytics.change(BigDecimal.TEN,BigDecimal.ZERO)).isNull();
        assertThat(SalesBoardAnalytics.change(null,BigDecimal.ONE)).isNull();
        assertThat(SalesBoardAnalytics.change(BigDecimal.ZERO,BigDecimal.TEN)).isEqualByComparingTo("-100");
        assertThat(SalesBoardAnalytics.change(new BigDecimal("15"),BigDecimal.TEN)).isEqualByComparingTo("50");
    }
}
