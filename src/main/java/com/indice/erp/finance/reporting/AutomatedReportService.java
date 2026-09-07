package com.indice.erp.finance.reporting;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.kpis.KpiRequestAccessService;
import com.indice.erp.kpis.executive.ExecutiveKpiService;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Opt-in, owner-scoped report snapshots. Delivery remains inside the authenticated application. */
@Service
class AutomatedReportService {
    private final JdbcTemplate jdbc;
    private final KpiRequestAccessService access;
    private final SessionAuthService sessions;
    private final ExecutiveKpiService executive;
    private final FinancialReportingService accounting;
    private final FinanceBusinessTimeZoneResolver timezones;
    private final ObjectMapper json;
    AutomatedReportService(JdbcTemplate jdbc, KpiRequestAccessService access, SessionAuthService sessions,
            ExecutiveKpiService executive, FinancialReportingService accounting, FinanceBusinessTimeZoneResolver timezones, ObjectMapper json) {
        this.jdbc = jdbc; this.access = access; this.sessions = sessions; this.executive = executive;
        this.accounting = accounting; this.timezones = timezones; this.json = json;
    }

    @Transactional(readOnly = true)
    List<Rule> list(AuthSessionUser user) {
        access.central(user, "automated-reports", null, null);
        return jdbc.query(selectRule() + " WHERE rule.company_id = ? AND rule.created_by_user_id = ? ORDER BY rule.id DESC",
            this::mapRule, user.companyId(), user.userId());
    }

    @Transactional
    Rule save(AuthSessionUser user, Long id, RuleRequest request) {
        if (request == null || request.title() == null || request.title().isBlank() || request.title().trim().length() > 140
                || request.description() == null || request.description().length() > 500
                || request.reportType() == null || !List.of("EXECUTIVE", "ACCOUNTING").contains(request.reportType())
                || request.cadence() == null || !List.of("MANUAL", "DAILY", "WEEKLY", "MONTHLY").contains(request.cadence())
                || request.status() == null || !List.of("draft", "ready", "paused").contains(request.status()))
            throw new IllegalArgumentException("Completa el nombre, tipo, frecuencia y estado de la regla.");
        String currency = request.preferredCurrency() == null ? "" : request.preferredCurrency().trim().toUpperCase(java.util.Locale.ROOT);
        java.util.Currency.getInstance(currency);
        var scope = authorized(user, request.reportType(), request.unitId(), request.businessId());
        if (request.unitId() != null && jdbc.queryForObject("SELECT COUNT(*) FROM units WHERE company_id = ? AND id = ?", Integer.class, user.companyId(), request.unitId()) != 1)
            throw new IllegalArgumentException("La unidad no pertenece a la empresa.");
        if (request.businessId() != null && jdbc.queryForObject("SELECT COUNT(*) FROM businesses WHERE company_id = ? AND id = ? AND (? IS NULL OR unit_id = ?)",
                Integer.class, user.companyId(), request.businessId(), scope.unitId(), scope.unitId()) != 1)
            throw new IllegalArgumentException("El negocio no pertenece al alcance elegido.");
        Instant next = "ready".equals(request.status()) ? nextRun(user.companyId(), request.cadence()) : null;
        if (id == null) {
            var key = new GeneratedKeyHolder();
            jdbc.update(connection -> {
                var statement = connection.prepareStatement("""
                    INSERT INTO kpi_automated_report_rules (company_id, created_by_user_id, title, description,
                      report_type, cadence, status, unit_id, business_id, preferred_currency, next_run_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
                Object[] values = {user.companyId(), user.userId(), request.title().trim(), request.description().trim(), request.reportType(),
                    request.cadence(), request.status(), scope.unitId(), scope.businessId(), currency, next == null ? null : Timestamp.from(next)};
                for (int i = 0; i < values.length; i++) statement.setObject(i + 1, values[i]);
                return statement;
            }, key);
            id = Objects.requireNonNull(key.getKey()).longValue();
        } else {
            Rule previous = owned(user, id, true);
            if (previous.version() != request.version()) throw new IllegalArgumentException("La regla cambió. Actualiza antes de guardar.");
            jdbc.update("""
                UPDATE kpi_automated_report_rules SET title = ?, description = ?, report_type = ?, cadence = ?, status = ?,
                  unit_id = ?, business_id = ?, preferred_currency = ?, next_run_at = ?, version = version + 1, last_error_code = NULL
                WHERE company_id = ? AND id = ? AND created_by_user_id = ?
                """, request.title().trim(), request.description().trim(), request.reportType(), request.cadence(), request.status(),
                scope.unitId(), scope.businessId(), currency, next == null ? null : Timestamp.from(next), user.companyId(), id, user.userId());
        }
        return owned(user, id, false);
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    RunResponse generate(AuthSessionUser user, long id, String key) {
        if (key == null || !key.matches("[A-Za-z0-9_:-]{8,140}")) throw new IllegalArgumentException("Referencia de ejecución inválida.");
        Rule rule = owned(user, id, true);
        return generate(user, rule, key);
    }

    @Transactional(readOnly = true)
    RunResponse download(AuthSessionUser user, long ruleId, long runId) {
        owned(user, ruleId, false);
        var rows = jdbc.query("SELECT * FROM kpi_automated_report_runs WHERE company_id = ? AND rule_id = ? AND id = ?", (rs, row) -> {
            requireSameScope(user, rs.getString("report_type"), rs.getObject("unit_id", Long.class), rs.getObject("business_id", Long.class));
            return new RunResponse(rs.getLong("id"), ruleId, rs.getString("report_type"), rs.getObject("from_date", LocalDate.class),
                rs.getObject("to_date", LocalDate.class), rs.getTimestamp("created_at").toInstant(), read(rs.getString("snapshot_json")));
        }, user.companyId(), ruleId, runId);
        return rows.stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    List<DueRule> dueRules() {
        return jdbc.query("SELECT company_id, id, created_by_user_id FROM kpi_automated_report_rules WHERE status = 'ready' AND next_run_at <= CURRENT_TIMESTAMP ORDER BY next_run_at, id LIMIT 20",
            (rs, row) -> new DueRule(rs.getLong(1), rs.getLong(2), rs.getLong(3)));
    }

    @Transactional
    void runScheduled(DueRule due) {
        var actor = sessions.scheduledActor(due.user(), due.company()).orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
        Rule rule = owned(actor, due.id(), true);
        if (!"ready".equals(rule.status()) || rule.nextRun() == null || rule.nextRun().isAfter(Instant.now())) return;
        generate(actor, rule, "schedule:" + rule.nextRun().toEpochMilli());
        jdbc.update("UPDATE kpi_automated_report_rules SET next_run_at = ? WHERE company_id = ? AND id = ?",
            Timestamp.from(nextRun(due.company(), rule.cadence())), due.company(), due.id());
    }

    @Transactional
    void pauseFailure(DueRule due) {
        jdbc.update("UPDATE kpi_automated_report_rules SET status = 'paused', next_run_at = NULL, last_error_code = 'REVIEW_REQUIRED', version = version + 1 WHERE company_id = ? AND id = ? AND status = 'ready'",
            due.company(), due.id());
    }

    private RunResponse generate(AuthSessionUser user, Rule rule, String key) {
        requireSameScope(user, rule.reportType(), rule.unitId(), rule.businessId());
        var existing = jdbc.query("SELECT id FROM kpi_automated_report_runs WHERE company_id = ? AND rule_id = ? AND run_key = ?", (rs, row) -> rs.getLong(1), user.companyId(), rule.id(), key);
        if (!existing.isEmpty()) return download(user, rule.id(), existing.getFirst());
        LocalDate today = LocalDate.now(timezones.resolve(user.companyId()));
        LocalDate to = today.minusDays(1);
        LocalDate from = switch (rule.cadence()) {
            case "DAILY" -> to;
            case "WEEKLY" -> to.minusDays(6);
            case "MONTHLY" -> YearMonth.from(today).minusMonths(1).atDay(1);
            default -> today.getDayOfMonth() == 1 ? to.withDayOfMonth(1) : today.withDayOfMonth(1);
        };
        if ("MONTHLY".equals(rule.cadence())) to = YearMonth.from(today).minusMonths(1).atEndOfMonth();
        var selection = new KpiRequestAccessService.Selection(rule.unitId(), rule.businessId());
        Object payload = "ACCOUNTING".equals(rule.reportType())
            ? accounting.report(user.companyId(), from, to, rule.unitId(), rule.businessId())
            : executive.getExecutivePanel(user.companyId(), user.userId(), selection.apply(Map.of("period", "custom", "from", from.toString(), "to", to.toString(), "preferredCurrency", rule.preferredCurrency())));
        String snapshot = write(payload);
        jdbc.update("""
            INSERT INTO kpi_automated_report_runs (company_id, rule_id, requested_by_user_id, run_key, report_type,
              from_date, to_date, unit_id, business_id, currency_code, snapshot_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
            """, user.companyId(), rule.id(), user.userId(), key, rule.reportType(), from, to, rule.unitId(), rule.businessId(), rule.preferredCurrency(), snapshot);
        long runId = jdbc.queryForObject("SELECT id FROM kpi_automated_report_runs WHERE company_id = ? AND rule_id = ? AND run_key = ?", Long.class, user.companyId(), rule.id(), key);
        jdbc.update("UPDATE kpi_automated_report_rules SET last_run_at = CURRENT_TIMESTAMP, last_error_code = NULL WHERE company_id = ? AND id = ?", user.companyId(), rule.id());
        return download(user, rule.id(), runId);
    }

    private Rule owned(AuthSessionUser user, long id, boolean lock) {
        access.central(user, "automated-reports", null, null);
        return jdbc.query(selectRule() + " WHERE rule.company_id = ? AND rule.id = ? AND rule.created_by_user_id = ?" + (lock ? " FOR UPDATE" : ""),
            this::mapRule, user.companyId(), id, user.userId()).stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
    private KpiRequestAccessService.Selection authorized(AuthSessionUser user, String type, Long unit, Long business) {
        access.central(user, "automated-reports", unit, business);
        return access.central(user, "ACCOUNTING".equals(type) ? "accounting-reports" : "kpis", unit, business);
    }
    private void requireSameScope(AuthSessionUser user, String type, Long unit, Long business) {
        var actual = authorized(user, type, unit, business);
        if (!Objects.equals(actual.unitId(), unit) || !Objects.equals(actual.businessId(), business))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "The report scope changed; review the rule.");
    }
    private Instant nextRun(long company, String cadence) {
        var today = LocalDate.now(timezones.resolve(company));
        var date = switch (cadence) { case "DAILY" -> today.plusDays(1); case "WEEKLY" -> today.plusWeeks(1); case "MONTHLY" -> YearMonth.from(today).plusMonths(1).atDay(1); default -> null; };
        return date == null ? null : date.atStartOfDay(timezones.resolve(company)).toInstant();
    }
    private String selectRule() {
        return "SELECT rule.*, (SELECT MAX(run.id) FROM kpi_automated_report_runs run WHERE run.company_id = rule.company_id AND run.rule_id = rule.id) latest_run_id FROM kpi_automated_report_rules rule";
    }
    private Rule mapRule(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        var next = rs.getTimestamp("next_run_at");
        return new Rule(rs.getLong("id"), rs.getString("title"), rs.getString("description"), rs.getString("report_type"), rs.getString("cadence"),
            rs.getString("status"), rs.getObject("unit_id", Long.class), rs.getObject("business_id", Long.class), rs.getString("preferred_currency"),
            next == null ? null : next.toInstant(), rs.getInt("version"), rs.getObject("latest_run_id", Long.class), rs.getString("last_error_code"));
    }
    private String write(Object value) { try { return json.writeValueAsString(value); } catch (Exception error) { throw new IllegalStateException("Cannot preserve report snapshot", error); } }
    private JsonNode read(String value) { try { return json.readTree(value); } catch (Exception error) { throw new IllegalStateException("Cannot read report snapshot", error); } }
    record RuleRequest(String title, String description, String reportType, String cadence, String status, Long unitId, Long businessId, String preferredCurrency, int version) {}
    record Rule(long id, String title, String description, String reportType, String cadence, String status, Long unitId, Long businessId, String preferredCurrency, Instant nextRun, int version, Long latestRunId, String lastErrorCode) {}
    record RunResponse(long id, long ruleId, String reportType, LocalDate from, LocalDate to, Instant generatedAt, JsonNode snapshot) {}
    record DueRule(long company, long id, long user) {}
}
