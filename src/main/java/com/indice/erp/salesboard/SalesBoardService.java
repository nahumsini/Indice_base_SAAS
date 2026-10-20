package com.indice.erp.salesboard;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.exchange.BusinessExchangeRateService;
import com.indice.erp.exchange.BusinessExchangeRateEvidence;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.finance.reporting.SalePostingEvidenceService;
import com.indice.erp.kpis.currency.*;
import com.indice.erp.sales.reporting.SalesReportingContracts.*;
import com.indice.erp.sales.reporting.SalesReportingReadService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.salesboard.SalesBoardContracts.*;

@Service
public class SalesBoardService {
    private final SalesReportingReadService sales;
    private final SalePostingEvidenceService accounting;
    private final HrOperationalScopeService scopes;
    private final FinanceBusinessTimeZoneResolver zones;
    private final BusinessExchangeRateService rates;
    private final KpiCurrencyAggregationService money;
    public SalesBoardService(SalesReportingReadService sales,SalePostingEvidenceService accounting,HrOperationalScopeService scopes,
        FinanceBusinessTimeZoneResolver zones,BusinessExchangeRateService rates,KpiCurrencyAggregationService money) {
        this.sales=sales; this.accounting=accounting; this.scopes=scopes; this.zones=zones; this.rates=rates; this.money=money;
    }
    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Workspace read(AuthSessionUser actor,String from,String to,String search,String origin,String channel,String status,
        Long unit,Long business,int page,int pageSize,String sort,String direction,String currency,String granularity) {
        var zone=zones.resolve(actor.companyId()); var today=LocalDate.now(zone);
        LocalDate start=parse(from,today.withDayOfMonth(1)),end=parse(to,today);
        require(!end.isBefore(start) && start.getYear()>=1011 && end.getYear()<=9999 && ChronoUnit.DAYS.between(start,end)<=3660);
        require(search.length()<=180 && channel.length()<=40 && Set.of("ALL","SALES","POS","UNKNOWN").contains(origin)
            && Set.of("ALL","ACTIVE","CANCELLED").contains(status) && page>=1 && page<=1000000
            && Set.of(10,25,50,100,200).contains(pageSize) && Set.of("date","number","customer","amount").contains(sort)
            && Set.of("asc","desc").contains(direction) && currency.matches("[A-Z]{3}")
            && (unit==null || unit>0) && (business==null || business>0) && Set.of("auto","day","week","month").contains(granularity));
        var data=sales.read(actor.companyId(),scopes.resolve(actor),new Filter(start,end,search.trim(),origin,channel,status,unit,business,page,pageSize,sort,direction));
        var evidence=accounting.read(actor.companyId(),data.items().stream().map(Sale::id).toList());
        var exchange=rates.loadDailyRates();
        Map<String,BigDecimal> verified=BusinessExchangeRateEvidence.verifiedRates(exchange,today,true);
        LocalDate rateDate=null;
        try { if(exchange.metadata()!=null) rateDate=LocalDate.parse(exchange.metadata().sourceDate()); } catch(RuntimeException ignored) { }
        var projection=new Projection(currency,verified,rateDate,exchange.metadata()==null?"":exchange.metadata().sourceName());
        var grouped=new LinkedHashMap<String,List<NativeGroup>>();
        for(var group:data.groups()) grouped.computeIfAbsent(group.origin()+":"+group.channel(),key->new ArrayList<>()).add(group);
        var summary=projection.summary(data.groups());
        var analytics=SalesBoardAnalytics.build(start,end,granularity,data.history(),summary,rows->money.aggregate(
            rows.stream().filter(row->row.active()>0).map(row->new KpiMoneyAmount(row.total(),row.currency())).toList(),currency,verified,"daily",projection.date,projection.source));
        return new Workspace(new Context(start,end,today,zone.getId(),"sales-board-v1"),
            data.items().stream().map(sale->new Row(sale,evidence.get(sale.id()))).toList(),data.total(),page,pageSize,
            summary,grouped.values().stream().map(rows->new Group(rows.getFirst().origin(),rows.getFirst().channel(),projection.summary(rows))).toList(),analytics,data.options());
    }
    private class Projection {
        private final String currency,source; private final Map<String,BigDecimal> rates; private final LocalDate date;
        Projection(String currency,Map<String,BigDecimal> rates,LocalDate date,String source) { this.currency=currency;this.rates=rates;this.date=date;this.source=source; }
        KpiMonetaryAggregate aggregate(List<NativeGroup> groups,Function<NativeGroup,BigDecimal> field) {
            return money.aggregate(groups.stream().filter(row->row.active()>0).map(row->new KpiMoneyAmount(field.apply(row),row.currency())).toList(),currency,rates,"daily",date,source);
        }
        Summary summary(List<NativeGroup> rows) {
            long active=rows.stream().mapToLong(NativeGroup::active).sum();
            var total=aggregate(rows,NativeGroup::total);
            return new Summary(rows.stream().mapToLong(NativeGroup::records).sum(),active,rows.stream().mapToLong(NativeGroup::cancelled).sum(),
                total,aggregate(rows,NativeGroup::tax),aggregate(rows,NativeGroup::beforeTax),SalesBoardAnalytics.average(total,active));
        }
    }
    private LocalDate parse(String value,LocalDate fallback) {
        try { return value==null || value.isBlank()?fallback:LocalDate.parse(value); }
        catch(RuntimeException invalid) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"sales_board_date_invalid"); }
    }
    private static void require(boolean condition) { if(!condition) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"sales_board_filters_invalid"); }
}
