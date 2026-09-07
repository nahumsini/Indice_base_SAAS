package com.indice.erp.sales;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.exchange.BusinessExchangeRateEvidence;
import com.indice.erp.exchange.BusinessExchangeRateService;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.kpis.currency.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only projection of persisted commission snapshots, using the central KPI currency engine. */
@Service
public class SalesCommissionSummaryService {
    public record Selection(@Positive long saleId, @NotEmpty @Size(max=1000) List<@Min(0) Integer> componentIndexes) {}
    public record Query(@NotBlank @Pattern(regexp="[A-Za-z]{3}") String preferredCurrency,
                        @NotNull @Size(max=10000) List<@NotNull @Valid Selection> selections) {}
    public record Summary(KpiMonetaryAggregate total, KpiMonetaryAggregate pending,
                          KpiMonetaryAggregate approved, KpiMonetaryAggregate paid,
                          KpiMonetaryAggregate salesBase, BigDecimal commissionRate, boolean incomplete) {}
    private record Snapshot(long id, String currency, BigDecimal saleAmount, BigDecimal commissionAmount,
                            String status, String commercialStatus, String breakdown) {}
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final BusinessExchangeRateService exchange;
    private final KpiCurrencyAggregationService aggregation;
    private final FinanceBusinessTimeZoneResolver timezones;

    public SalesCommissionSummaryService(JdbcTemplate jdbc, ObjectMapper mapper, BusinessExchangeRateService exchange,
            KpiCurrencyAggregationService aggregation, FinanceBusinessTimeZoneResolver timezones) {
        this.jdbc=jdbc; this.mapper=mapper; this.exchange=exchange; this.aggregation=aggregation; this.timezones=timezones;
    }

    @Transactional(readOnly=true)
    public Summary summarize(long companyId, HrOperationalScope scope, Query query) {
        if (scope == null || query == null || query.selections() == null || query.selections().size() > 10000)
            throw new IllegalArgumentException("Invalid commission selection.");
        var selected = new LinkedHashMap<Long, Set<Integer>>();
        for (var item : query.selections()) {
            if (item == null || item.saleId() <= 0 || item.componentIndexes() == null || item.componentIndexes().isEmpty()
                || item.componentIndexes().size() > 1000 || item.componentIndexes().stream().anyMatch(i -> i == null || i < 0))
                throw new IllegalArgumentException("Invalid commission selection.");
            selected.computeIfAbsent(item.saleId(), ignored -> new LinkedHashSet<>()).addAll(item.componentIndexes());
        }
        var rows = load(companyId, scope, selected.keySet());
        if (rows.size() != selected.size()) throw new NoSuchElementException("One or more selected sales are unavailable.");
        var total = new ArrayList<KpiMoneyAmount>();
        var pending = new ArrayList<KpiMoneyAmount>();
        var approved = new ArrayList<KpiMoneyAmount>();
        var paid = new ArrayList<KpiMoneyAmount>();
        var salesBase = new ArrayList<KpiMoneyAmount>();
        boolean incomplete = false;
        for (var row : rows) {
            if (Set.of("cancelled", "canceled", "rejected", "voided").contains(row.commercialStatus().trim().toLowerCase(Locale.ROOT))) continue;
            if (row.saleAmount() == null || row.commissionAmount() == null)
                throw new IllegalArgumentException("Commission snapshot is incomplete. Review the original sale.");
            var components = components(row);
            BigDecimal amount = BigDecimal.ZERO;
            for (int index : selected.get(row.id())) {
                if (index >= components.size()) throw new IllegalArgumentException("Commission selection changed. Reload sales.");
                amount = amount.add(components.get(index));
            }
            var snapshotTotal = components.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            incomplete |= snapshotTotal.setScale(2, RoundingMode.HALF_UP).compareTo(row.commissionAmount().setScale(2, RoundingMode.HALF_UP)) != 0;
            var money = new KpiMoneyAmount(amount, row.currency());
            total.add(money);
            switch (row.status().trim().toLowerCase(Locale.ROOT)) {
                case "paid" -> paid.add(money);
                case "calculated" -> approved.add(money);
                default -> pending.add(money);
            }
            // Exactly one denominator per selected sale, regardless of its number of commission components.
            salesBase.add(new KpiMoneyAmount(row.saleAmount(), row.currency()));
        }
        var snapshot = exchange.loadDailyRates();
        var today = LocalDate.now(timezones.resolve(companyId));
        var rates = BusinessExchangeRateEvidence.verifiedRates(snapshot, today, true);
        LocalDate effectiveDate = null;
        try { effectiveDate = LocalDate.parse(snapshot.metadata().sourceDate()); } catch (RuntimeException ignored) { }
        var date = effectiveDate;
        var source = snapshot.metadata() == null ? "" : snapshot.metadata().sourceName();
        java.util.function.Function<List<KpiMoneyAmount>, KpiMonetaryAggregate> aggregate = amounts -> aggregation.aggregate(
            amounts, query.preferredCurrency(), rates, "daily", date, source);
        var totalAggregate = aggregate.apply(total);
        var baseAggregate = aggregate.apply(salesBase);
        var rate = incomplete || totalAggregate.partial() || baseAggregate.partial() || baseAggregate.preferredTotal().signum() <= 0
            ? null : totalAggregate.preferredTotal().multiply(BigDecimal.valueOf(100)).divide(baseAggregate.preferredTotal(), 4, RoundingMode.HALF_UP);
        return new Summary(totalAggregate, aggregate.apply(pending), aggregate.apply(approved), aggregate.apply(paid), baseAggregate, rate, incomplete);
    }

    private List<Snapshot> load(long companyId, HrOperationalScope scope, Set<Long> ids) {
        if (ids.isEmpty()) return List.of();
        var params = new ArrayList<Object>(); params.add(companyId); params.addAll(ids); params.addAll(scope.assignmentParameters());
        return jdbc.query("""
            SELECT s.id, s.currency, s.total_amount, s.commission_amount, s.commission_status,
                   s.commercial_status, s.commission_breakdown_json
            FROM sales_records s WHERE s.company_id = ? AND s.deleted_at IS NULL AND s.id IN (%s)
            """.formatted(String.join(",", Collections.nCopies(ids.size(), "?")))
            + scope.assignmentPredicate("s.unit_id", "s.business_id", "s.company_id"),
            (rs, n) -> new Snapshot(rs.getLong("id"), rs.getString("currency"), rs.getBigDecimal("total_amount"),
                rs.getBigDecimal("commission_amount"), Objects.toString(rs.getString("commission_status"), "pending"),
                Objects.toString(rs.getString("commercial_status"), ""), rs.getString("commission_breakdown_json")), params.toArray());
    }

    private List<BigDecimal> components(Snapshot row) {
        try {
            JsonNode node = row.breakdown() == null ? null : mapper.readTree(row.breakdown());
            if (node == null || node.isNull() || (node.isArray() && node.isEmpty())) return List.of(row.commissionAmount());
            if (!node.isArray()) throw new IllegalArgumentException();
            var amounts = new ArrayList<BigDecimal>();
            for (var item : node) amounts.add(new BigDecimal(item.path("commissionAmount").asText()));
            return amounts;
        } catch (Exception invalid) {
            throw new IllegalArgumentException("Commission snapshot is incomplete. Review the original sale.");
        }
    }
}
