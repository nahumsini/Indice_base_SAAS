package com.indice.erp.sales;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.exchange.BusinessExchangeRateService;
import com.indice.erp.hr.incentives.HrIncentiveService;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import com.indice.erp.kpis.currency.KpiMoneyAmount;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SalesCommissionCutService {
    private final JdbcTemplate jdbcTemplate;
    private final HrIncentiveService incentiveService;
    private final BusinessExchangeRateService exchangeRateService;
    private final KpiCurrencyAggregationService currencyAggregationService;
    private final ObjectMapper objectMapper;

    public SalesCommissionCutService(
        JdbcTemplate jdbcTemplate,
        HrIncentiveService incentiveService,
        BusinessExchangeRateService exchangeRateService,
        KpiCurrencyAggregationService currencyAggregationService,
        ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.incentiveService = incentiveService;
        this.exchangeRateService = exchangeRateService;
        this.currencyAggregationService = currencyAggregationService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Map<String, Object> create(AuthSessionUser user, Map<String, Object> payload) {
        var start = date(payload.get("periodStart"));
        var end = date(payload.get("periodEnd"));
        if (start == null || end == null || end.isBefore(start)) throw new IllegalArgumentException("El periodo del corte no es válido.");
        var rows = eligible(user.companyId(), start, end);
        if (rows.isEmpty()) throw new IllegalArgumentException("No hay comisiones disponibles para este periodo.");

        var cutId = insertCut(user, start, end);
        var code = "COM-CUT-%06d".formatted(cutId);
        jdbcTemplate.update("UPDATE sales_commission_cuts SET cut_code = ? WHERE id = ?", code, cutId);

        var groups = new LinkedHashMap<String, List<CommissionRow>>();
        rows.forEach(row -> groups.computeIfAbsent(row.userCompanyId() + "|" + row.currency(), ignored -> new ArrayList<>()).add(row));
        var total = BigDecimal.ZERO;
        for (var group : groups.values()) {
            var first = group.getFirst();
            var amount = group.stream().map(CommissionRow::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
            var payloadForHr = new LinkedHashMap<String, Object>();
            payloadForHr.put("name", "Comisiones · " + code);
            payloadForHr.put("description", "Corte de comisiones " + start + " al " + end + ". Se consume una sola vez en nómina.");
            payloadForHr.put("incentive_type", "manual"); payloadForHr.put("amount", amount);
            payloadForHr.put("currency_code", first.currency()); payloadForHr.put("effective_start_date", end.toString());
            payloadForHr.put("status", "active"); payloadForHr.put("scope_type", "employees");
            payloadForHr.put("target_user_company_ids", List.of(first.userCompanyId())); payloadForHr.put("application_mode", "next_payroll");
            payloadForHr.put("source_reference_type", "sales_commission_cut"); payloadForHr.put("source_reference_id", code);
            var incentive = incentiveService.createIncentive(user, payloadForHr);
            var incentiveId = ((Number) incentive.get("id")).longValue();
            for (var row : group) {
                jdbcTemplate.update("INSERT INTO sales_commission_cut_items (cut_id, company_id, sale_id, user_company_id, amount, currency_code, hr_incentive_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        cutId, user.companyId(), row.saleId(), row.userCompanyId(), row.amount(), row.currency(), incentiveId);
                jdbcTemplate.update("UPDATE sales_records SET commission_status = 'cut' WHERE id = ? AND company_id = ?", row.saleId(), user.companyId());
            }
            total = total.add(amount);
        }
        var preferredCurrency = normalizeCurrency(payload.get("preferredCurrency"));
        var rates = exchangeRateService.loadDailyRates();
        var rateMetadata = rates.metadata();
        var rateDate = rateMetadata == null || rateMetadata.sourceDate() == null || rateMetadata.sourceDate().isBlank()
            ? LocalDate.now() : LocalDate.parse(rateMetadata.sourceDate());
        var currencySnapshot = currencyAggregationService.aggregate(
            rows.stream().map(row -> new KpiMoneyAmount(row.amount(), row.currency())).toList(),
            preferredCurrency, rates.ratesPerUsd(), "snapshot", rateDate,
            rateMetadata == null ? "" : rateMetadata.sourceName()
        );
        jdbcTemplate.update("""
            UPDATE sales_commission_cuts
            SET total_amount = ?, preferred_currency = ?, preferred_total_amount = ?, exchange_rate_mode = ?,
                exchange_rate_effective_date = ?, exchange_rate_source = ?, exchange_rates_snapshot_json = ?,
                native_totals_snapshot_json = ?, currency_snapshot_partial = ?, currency_snapshot_excluded_records = ?,
                commission_count = ?, employee_count = ?
            WHERE id = ?
            """,
            currencySnapshot.preferredTotal(), currencySnapshot.preferredCurrency(), currencySnapshot.preferredTotal(),
            currencySnapshot.exchangeRate().mode(), Date.valueOf(currencySnapshot.exchangeRate().effectiveDate()),
            currencySnapshot.exchangeRate().source(), json(rates.ratesPerUsd()), json(currencySnapshot.nativeTotals()),
            currencySnapshot.partial(), currencySnapshot.excludedRecords(), rows.size(), groups.size(), cutId);
        return get(user.companyId(), cutId);
    }

    public List<Map<String, Object>> list(long companyId) {
        return jdbcTemplate.query("SELECT c.*, (SELECT COUNT(DISTINCT a.id) FROM hr_incentive_applications a JOIN sales_commission_cut_items i ON i.hr_incentive_id = a.incentive_id WHERE i.cut_id = c.id AND a.status = 'applied') AS applied_count FROM sales_commission_cuts c WHERE c.company_id = ? ORDER BY c.created_at DESC", (rs, n) -> {
            var row = new LinkedHashMap<String, Object>();
            row.put("id", rs.getLong("id")); row.put("cutCode", rs.getString("cut_code"));
            row.put("periodStart", rs.getObject("period_start", LocalDate.class).toString()); row.put("periodEnd", rs.getObject("period_end", LocalDate.class).toString());
            var applied = rs.getInt("applied_count");
            row.put("status", applied >= rs.getInt("employee_count") && rs.getInt("employee_count") > 0 ? "consumed" : rs.getString("status")); row.put("totalAmount", rs.getBigDecimal("total_amount"));
            row.put("preferredCurrency", rs.getString("preferred_currency"));
            row.put("preferredTotalAmount", rs.getBigDecimal("preferred_total_amount"));
            row.put("exchangeRateMode", rs.getString("exchange_rate_mode"));
            row.put("exchangeRateEffectiveDate", rs.getObject("exchange_rate_effective_date", LocalDate.class));
            row.put("exchangeRateSource", rs.getString("exchange_rate_source"));
            row.put("currencySnapshotPartial", rs.getBoolean("currency_snapshot_partial"));
            row.put("currencySnapshotExcludedRecords", rs.getInt("currency_snapshot_excluded_records"));
            row.put("commissionCount", rs.getInt("commission_count")); row.put("employeeCount", rs.getInt("employee_count"));
            row.put("currencyTotals", currencyTotals(rs.getLong("id")));
            row.put("appliedCount", applied); return row;
        }, companyId);
    }

    public List<Map<String, Object>> schedules(long companyId) {
        return jdbcTemplate.query("SELECT id, schedule_name, cadence, preferred_currency, timezone, status, next_run_date, last_run_at FROM sales_commission_cut_schedules WHERE company_id = ? ORDER BY status = 'active' DESC, schedule_name", (rs, n) -> {
            var row = new LinkedHashMap<String, Object>();
            row.put("id", rs.getLong("id")); row.put("name", rs.getString("schedule_name"));
            row.put("cadence", rs.getString("cadence")); row.put("timezone", rs.getString("timezone"));
            row.put("preferredCurrency", rs.getString("preferred_currency"));
            row.put("status", rs.getString("status")); row.put("nextRunDate", rs.getObject("next_run_date", LocalDate.class).toString());
            row.put("lastRunAt", rs.getTimestamp("last_run_at") == null ? null : rs.getTimestamp("last_run_at").toInstant().toString());
            return row;
        }, companyId);
    }

    @Transactional
    public Map<String, Object> saveSchedule(AuthSessionUser user, Map<String, Object> payload) {
        var id = payload.get("id") instanceof Number number ? number.longValue() : null;
        var name = String.valueOf(payload.getOrDefault("name", "")).trim();
        if (name.isBlank() || name.length() > 120) throw new IllegalArgumentException("Escribe un nombre válido para la automatización.");
        var cadence = String.valueOf(payload.getOrDefault("cadence", "monthly")).toLowerCase();
        if (!List.of("weekly", "semimonthly", "monthly").contains(cadence)) throw new IllegalArgumentException("La frecuencia automática no es válida.");
        var status = String.valueOf(payload.getOrDefault("status", "active")).toLowerCase();
        var preferredCurrency = normalizeCurrency(payload.get("preferredCurrency"));
        if (!List.of("active", "paused").contains(status)) throw new IllegalArgumentException("El estado de automatización no es válido.");
        var next = nextRun(cadence, LocalDate.now());
        if (id == null) {
            if (jdbcTemplate.queryForObject("SELECT COUNT(*) FROM sales_commission_cut_schedules WHERE company_id = ? AND schedule_name = ?", Integer.class, user.companyId(), name) > 0) throw new IllegalArgumentException("Ya existe una automatización con ese nombre.");
            jdbcTemplate.update("INSERT INTO sales_commission_cut_schedules (company_id, schedule_name, cadence, preferred_currency, status, next_run_date, created_by_user_id, created_by_user_company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    user.companyId(), name, cadence, preferredCurrency, status, Date.valueOf(next), user.userId(), user.userCompanyId());
            id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        } else {
            var updated = jdbcTemplate.update("UPDATE sales_commission_cut_schedules SET schedule_name = ?, cadence = ?, preferred_currency = ?, status = ?, next_run_date = ?, created_by_user_id = ?, created_by_user_company_id = ? WHERE id = ? AND company_id = ?",
                    name, cadence, preferredCurrency, status, Date.valueOf(next), user.userId(), user.userCompanyId(), id, user.companyId());
            if (updated == 0) throw new IllegalArgumentException("La automatización ya no está disponible.");
        }
        var savedId = id;
        return schedules(user.companyId()).stream().filter(item -> ((Number) item.get("id")).longValue() == savedId).findFirst().orElseThrow();
    }

    @Transactional
    public void deleteSchedule(long companyId, long id) {
        if (jdbcTemplate.update("DELETE FROM sales_commission_cut_schedules WHERE id = ? AND company_id = ?", id, companyId) == 0) throw new IllegalArgumentException("La automatización ya no está disponible.");
    }

    @Transactional
    public void executeAutomatic(long scheduleId, AuthSessionUser user, String cadence, String preferredCurrency, LocalDate runDate) {
        var claimed = jdbcTemplate.update("UPDATE sales_commission_cut_schedules SET next_run_date = ? WHERE id = ? AND company_id = ? AND status = 'active' AND next_run_date = ?",
                Date.valueOf(nextRun(cadence, runDate)), scheduleId, user.companyId(), Date.valueOf(runDate));
        if (claimed == 0) return;
        var period = automaticPeriod(cadence, runDate);
        try {
            create(user, Map.of("periodStart", period[0].toString(), "periodEnd", period[1].toString(), "preferredCurrency", preferredCurrency));
        } catch (IllegalArgumentException ex) {
            if (!ex.getMessage().contains("No hay comisiones disponibles")) throw ex;
        }
        jdbcTemplate.update("UPDATE sales_commission_cut_schedules SET last_run_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?", scheduleId, user.companyId());
    }

    private LocalDate[] automaticPeriod(String cadence, LocalDate runDate) {
        if ("weekly".equals(cadence)) { var end = runDate.minusDays(1); return new LocalDate[]{end.minusDays(6), end}; }
        if ("semimonthly".equals(cadence) && runDate.getDayOfMonth() == 16) return new LocalDate[]{runDate.withDayOfMonth(1), runDate.minusDays(1)};
        var previous = YearMonth.from(runDate.minusMonths(1));
        if ("semimonthly".equals(cadence)) return new LocalDate[]{previous.atDay(16), previous.atEndOfMonth()};
        return new LocalDate[]{previous.atDay(1), previous.atEndOfMonth()};
    }

    private LocalDate nextRun(String cadence, LocalDate from) {
        if ("weekly".equals(cadence)) {
            var days = (DayOfWeek.MONDAY.getValue() - from.getDayOfWeek().getValue() + 7) % 7;
            return from.plusDays(days == 0 ? 7 : days);
        }
        if ("semimonthly".equals(cadence)) return from.getDayOfMonth() < 16 ? from.withDayOfMonth(16) : from.plusMonths(1).withDayOfMonth(1);
        return from.plusMonths(1).withDayOfMonth(1);
    }

    private Map<String, BigDecimal> currencyTotals(long cutId) {
        var totals = new LinkedHashMap<String, BigDecimal>();
        jdbcTemplate.query(
                        "SELECT currency_code, SUM(amount) total FROM sales_commission_cut_items WHERE cut_id = ? GROUP BY currency_code ORDER BY currency_code",
                        (rs, rowNum) -> Map.entry(rs.getString("currency_code"), rs.getBigDecimal("total")),
                        cutId)
                .forEach(entry -> totals.put(entry.getKey(), entry.getValue()));
        return totals;
    }

    private Map<String, Object> get(long companyId, long id) { return list(companyId).stream().filter(row -> ((Number) row.get("id")).longValue() == id).findFirst().orElseThrow(); }
    private String normalizeCurrency(Object value) {
        var currency = value == null ? "MXN" : String.valueOf(value).trim().toUpperCase();
        if (!currency.matches("[A-Z]{3}")) throw new IllegalArgumentException("La divisa preferida no es válida.");
        return currency;
    }
    private String json(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("No se pudo congelar el contexto monetario del corte.", ex); }
    }
    private long insertCut(AuthSessionUser user, LocalDate start, LocalDate end) {
        jdbcTemplate.update("INSERT INTO sales_commission_cuts (company_id, cut_code, period_start, period_end, created_by_user_id) VALUES (?, ?, ?, ?, ?)", user.companyId(), "PENDING-" + System.nanoTime(), Date.valueOf(start), Date.valueOf(end), user.userId());
        return jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }
    private List<CommissionRow> eligible(long companyId, LocalDate start, LocalDate end) {
        return jdbcTemplate.query("""
            SELECT s.id, s.seller_user_company_id, s.commission_amount, UPPER(COALESCE(s.currency, 'MXN')) currency
            FROM sales_records s
            WHERE s.company_id = ? AND s.sale_date BETWEEN ? AND ? AND s.commission_amount > 0
              AND s.seller_user_company_id IS NOT NULL AND s.commission_status IN ('calculated', 'approved')
              AND NOT EXISTS (SELECT 1 FROM sales_commission_cut_items i WHERE i.company_id = s.company_id AND i.sale_id = s.id)
            ORDER BY s.id
            """, (rs, n) -> new CommissionRow(rs.getLong(1), rs.getLong(2), rs.getBigDecimal(3), rs.getString(4)), companyId, Date.valueOf(start), Date.valueOf(end));
    }
    private LocalDate date(Object value) { try { return value == null ? null : LocalDate.parse(String.valueOf(value)); } catch (RuntimeException ex) { return null; } }
    private record CommissionRow(long saleId, long userCompanyId, BigDecimal amount, String currency) {}
}
