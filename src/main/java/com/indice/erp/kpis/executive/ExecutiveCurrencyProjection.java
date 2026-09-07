package com.indice.erp.kpis.executive;

import com.indice.erp.exchange.BusinessExchangeRateEvidence;
import com.indice.erp.exchange.BusinessExchangeRatesResponse;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import com.indice.erp.kpis.currency.KpiMoneyAmount;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/** Projects native owner totals into one analytical currency without altering operations. */
final class ExecutiveCurrencyProjection {
    private static final Set<String> MONEY = Set.of("salesTotal", "salesMargin", "collectedTotal",
        "expensesTotal", "payablesTotal", "overduePayables", "receivablesTotal", "overdueReceivables",
        "pettyCashBalance", "limitTotal", "balanceTotal", "total", "operatingProfit", "recognizedRevenue", "costOfSales", "recognizedOperatingExpenses");
    private final ExecutiveKpiScope scope;
    private final KpiCurrencyAggregationService aggregation;
    private final BusinessExchangeRatesResponse rates;

    ExecutiveCurrencyProjection(ExecutiveKpiScope scope, KpiCurrencyAggregationService aggregation,
            BusinessExchangeRatesResponse rates) {
        this.scope = scope;
        this.aggregation = aggregation;
        this.rates = rates;
    }

    List<Map<String, Object>> organizations(List<Map<String, Object>> rows) {
        return group(rows, row -> row.get("unitId") + "|" + row.get("businessId"));
    }

    List<Map<String, Object>> group(List<Map<String, Object>> rows, Function<Map<String, Object>, String> key) {
        var groups = new LinkedHashMap<String, List<Map<String, Object>>>();
        rows.forEach(row -> groups.computeIfAbsent(key.apply(row), ignored -> new ArrayList<>()).add(row));
        return groups.values().stream().map(this::project).toList();
    }

    private Map<String, Object> project(List<Map<String, Object>> nativeRows) {
        var result = new LinkedHashMap<String, Object>();
        var evidence = new LinkedHashMap<String, Object>();
        var first = nativeRows.getFirst();
        boolean partial = false;
        LocalDate rateDate = null;
        try {
            if (rates.metadata() != null) rateDate = LocalDate.parse(rates.metadata().sourceDate());
        } catch (RuntimeException ignored) {
            // Unknown rate dates remain unknown in the disclosed conversion evidence.
        }
        for (var field : first.keySet()) {
            if (MONEY.contains(field)) {
                var amounts = nativeRows.stream().map(row -> new KpiMoneyAmount(decimal(row.get(field)),
                    row.get("currency") instanceof String currency ? currency : null)).toList();
                var converted = aggregation.aggregate(amounts, scope.preferredCurrency(), BusinessExchangeRateEvidence.verifiedRates(rates, scope.snapshotDate(), true),
                    "daily", rateDate, rates.metadata() == null ? "" : rates.metadata().sourceName());
                result.put(field, converted.preferredTotal());
                evidence.put(field, converted);
                partial |= converted.partial();
            } else if (first.get(field) instanceof Number && !field.endsWith("Id")) {
                result.put(field, nativeRows.stream().map(row -> decimal(row.get(field)))
                    .reduce(BigDecimal.ZERO, BigDecimal::add));
            } else if (!"currency".equals(field)) {
                result.put(field, first.get(field));
            }
        }
        result.put("currency", scope.preferredCurrency());
        result.put("monetaryAggregates", evidence);
        result.put("monetaryPartial", partial);
        result.put("currencyConverted", true);
        return result;
    }

    private static BigDecimal decimal(Object value) {
        return value instanceof BigDecimal decimal ? decimal
            : value instanceof Number number ? new BigDecimal(number.toString()) : BigDecimal.ZERO;
    }
}
