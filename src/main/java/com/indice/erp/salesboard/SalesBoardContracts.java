package com.indice.erp.salesboard;

import com.indice.erp.finance.reporting.SalePostingEvidenceService.Evidence;
import com.indice.erp.kpis.currency.KpiMonetaryAggregate;
import com.indice.erp.sales.reporting.SalesReportingContracts;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;

public final class SalesBoardContracts {
    private SalesBoardContracts() { }
    public record Context(LocalDate from,LocalDate to,LocalDate asOfDate,String timeZone,String definitionVersion) { }
    public record Row(SalesReportingContracts.Sale sale,Evidence accounting) { }
    public record Summary(long records,long active,long cancelled,KpiMonetaryAggregate total,
        KpiMonetaryAggregate tax,KpiMonetaryAggregate beforeTax,BigDecimal averageTicket) { }
    public record Group(String origin,String channel,Summary summary) { }
    public record Comparison(LocalDate from,LocalDate to,long active,KpiMonetaryAggregate total,BigDecimal averageTicket,
        BigDecimal totalChangePercent,BigDecimal volumeChangePercent,BigDecimal averageChangePercent) { }
    public record Trend(LocalDate from,LocalDate to,LocalDate previousFrom,LocalDate previousTo,long active,
        KpiMonetaryAggregate total,long previousActive,KpiMonetaryAggregate previousTotal) { }
    public record Weekday(int day,long occurrences,long active,KpiMonetaryAggregate total,BigDecimal averagePerDay) { }
    public record Analytics(String granularity,Comparison comparison,List<Trend> trend,List<Weekday> weekdays) { }
    public record Workspace(Context context,List<Row> items,long total,int page,int pageSize,
        Summary summary,List<Group> channels,Analytics analytics,SalesReportingContracts.Options options) { }
}
