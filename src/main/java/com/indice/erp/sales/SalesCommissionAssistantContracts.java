package com.indice.erp.sales;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.indice.erp.exchange.BusinessExchangeRatesResponse;
import com.indice.erp.kpis.currency.KpiMonetaryAggregate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class SalesCommissionAssistantContracts {
    private SalesCommissionAssistantContracts() {}
    public interface ClosedInput {
        @JsonAnySetter default void reject(String key,Object value) { throw new IllegalArgumentException("Unexpected commission field: "+key); }
    }
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CutInput(LocalDate periodStart,LocalDate periodEnd,String preferredCurrency) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ScheduleInput(String name,String cadence,String preferredCurrency,String status) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Change(Long id,CutInput cut,ScheduleInput schedule,String status,String reason) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Query(Long id,String status,Integer limit,String cursor) implements ClosedInput {}
    public record Cut(long id,String cutCode,String periodStart,String periodEnd,String status,BigDecimal totalAmount,
        String preferredCurrency,BigDecimal preferredTotalAmount,String exchangeRateMode,LocalDate exchangeRateEffectiveDate,
        String exchangeRateSource,boolean currencySnapshotPartial,int currencySnapshotExcludedRecords,int commissionCount,
        int employeeCount,Map<String,BigDecimal> currencyTotals,int appliedCount) {}
    public record Schedule(long id,String name,String cadence,String timezone,String preferredCurrency,String status,String nextRunDate,String lastRunAt) {}
    public record IncentiveEffect(long userCompanyId,String currency,BigDecimal amount,List<Long> saleIds,
        List<com.indice.erp.hr.incentives.HrIncentiveService.AssistantApplication> payrollApplications) {}
    public record Records(List<Cut> cuts,List<Schedule> schedules) {public static Records empty(){return new Records(List.of(),List.of());}}
    public record ReadResult(Records records,int totalCount,boolean hasMore,String nextCursor,String scope) {}
    public record Prepared(String action,Change change,Records before,Records after,List<IncentiveEffect> incentives,
        KpiMonetaryAggregate monetarySummary,BusinessExchangeRatesResponse rates,Map<String,String> versions) {}
    public record Result(String action,Records records) {}
}
