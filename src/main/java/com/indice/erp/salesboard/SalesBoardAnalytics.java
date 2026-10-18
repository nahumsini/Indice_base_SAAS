package com.indice.erp.salesboard;

import com.indice.erp.kpis.currency.KpiMonetaryAggregate;
import com.indice.erp.sales.reporting.SalesReportingContracts.NativeDay;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import static com.indice.erp.salesboard.SalesBoardContracts.*;

/** Date-based registered-sales analysis; no inferred sale time, targets or forecasts. */
final class SalesBoardAnalytics {
    private SalesBoardAnalytics() { }

    static Analytics build(LocalDate from,LocalDate to,String requested,List<NativeDay> history,
        Summary current,Function<List<NativeDay>,KpiMonetaryAggregate> aggregate) {
        long days=ChronoUnit.DAYS.between(from,to)+1;
        String granularity=requested.equals("auto") ? days<=62?"day":days<=366?"week":"month" : requested;
        LocalDate previousFrom=from.minusDays(days),previousTo=from.minusDays(1);
        var previousRows=between(history,previousFrom,previousTo);
        var previousTotal=aggregate.apply(previousRows);
        long previousCount=count(previousRows);
        var previousAverage=average(previousTotal,previousCount);
        var comparison=new Comparison(previousFrom,previousTo,previousCount,previousTotal,previousAverage,
            change(complete(current.total()),complete(previousTotal)),change(BigDecimal.valueOf(current.active()),BigDecimal.valueOf(previousCount)),
            change(current.averageTicket(),previousAverage));
        var trend=new ArrayList<Trend>();
        for(LocalDate start=from;!start.isAfter(to);) {
            LocalDate end=switch(granularity) {
                case "week" -> start.plusDays(7-start.getDayOfWeek().getValue());
                case "month" -> start.withDayOfMonth(start.lengthOfMonth());
                default -> start;
            };
            if(end.isAfter(to)) end=to;
            var rows=between(history,start,end);
            var prior=between(history,start.minusDays(days),end.minusDays(days));
            trend.add(new Trend(start,end,start.minusDays(days),end.minusDays(days),count(rows),aggregate.apply(rows),count(prior),aggregate.apply(prior)));
            start=end.plusDays(1);
        }
        var weekdays=new ArrayList<Weekday>();
        for(int day=1;day<=7;day++) {
            final int weekday=day;
            long occurrences=from.datesUntil(to.plusDays(1)).filter(date->date.getDayOfWeek().getValue()==weekday).count();
            var rows=history.stream().filter(row->!row.date().isBefore(from) && !row.date().isAfter(to) && row.date().getDayOfWeek().getValue()==weekday).toList();
            var total=aggregate.apply(rows);
            weekdays.add(new Weekday(day,occurrences,count(rows),total,average(total,occurrences)));
        }
        return new Analytics(granularity,comparison,trend,weekdays);
    }

    static BigDecimal average(KpiMonetaryAggregate total,long count) {
        var amount=complete(total);
        return amount==null || count==0 ? null : amount.divide(BigDecimal.valueOf(count),2,RoundingMode.HALF_UP);
    }
    static BigDecimal complete(KpiMonetaryAggregate value) { return value.partial()?null:value.preferredTotal(); }
    static BigDecimal change(BigDecimal current,BigDecimal previous) {
        return current==null || previous==null || previous.signum()==0 ? null
            : current.subtract(previous).multiply(BigDecimal.valueOf(100)).divide(previous.abs(),2,RoundingMode.HALF_UP);
    }
    private static List<NativeDay> between(List<NativeDay> rows,LocalDate from,LocalDate to) {
        return rows.stream().filter(row->!row.date().isBefore(from) && !row.date().isAfter(to)).toList();
    }
    private static long count(List<NativeDay> rows) { return rows.stream().mapToLong(NativeDay::active).sum(); }
}
