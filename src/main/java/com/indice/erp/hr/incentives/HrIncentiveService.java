package com.indice.erp.hr.incentives;

import static com.indice.erp.hr.shared.HrPayloadUtils.longList;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseBigDecimal;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseDate;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;

import com.indice.erp.auth.AuthSessionUser;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HrIncentiveService {

    private static final LocalDate NEXT_PAYROLL_OPEN_END_DATE = LocalDate.of(9999, 12, 31);
    private static final Map<String, BigDecimal> DEFAULT_EXCHANGE_RATES_PER_USD = Map.of(
        "MXN", new BigDecimal("18.45"),
        "CAD", new BigDecimal("1.361624"),
        "USD", BigDecimal.ONE,
        "COP", new BigDecimal("4010.869565"),
        "BRL", new BigDecimal("5.507463")
    );

    private final JdbcTemplate jdbcTemplate;

    public HrIncentiveService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> listIncentives(AuthSessionUser currentUser, Map<String, String> filters) {
        var sql = new StringBuilder(
            """
                SELECT i.*,
                       COALESCE(a.total_applications, 0) AS eligible_count,
                       COALESCE(a.applied_applications, 0) AS applied_count
                FROM hr_incentives i
                LEFT JOIN (
                    SELECT incentive_id,
                           COUNT(*) AS total_applications,
                           SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) AS applied_applications
                    FROM hr_incentive_applications
                    WHERE company_id = ?
                    GROUP BY incentive_id
                ) a ON a.incentive_id = i.id
                WHERE i.company_id = ?
                  AND COALESCE(i.source_type, 'incentive') <> 'petty_cash_shortage'
                """
        );
        var params = new ArrayList<Object>();
        params.add(currentUser.companyId());
        params.add(currentUser.companyId());

        var search = value(filters.get("search"));
        if (!search.isBlank()) {
            sql.append(" AND (LOWER(i.name) LIKE ? OR LOWER(i.incentive_code) LIKE ? OR LOWER(COALESCE(i.description, '')) LIKE ?)");
            var like = "%" + search.toLowerCase(Locale.ROOT) + "%";
            params.add(like);
            params.add(like);
            params.add(like);
        }

        var status = normalizeStatus(filters.get("status"), "");
        if (!status.isBlank() && !"all".equals(status)) {
            sql.append(" AND i.status = ?");
            params.add(status);
        }

        var type = normalizeType(filters.get("type"));
        if (!type.isBlank() && !"all".equals(type)) {
            sql.append(" AND i.incentive_type = ?");
            params.add(type);
        }

        sql.append(" ORDER BY i.created_at DESC, i.id DESC");

        var rows = jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            var row = new LinkedHashMap<String, Object>();
            var id = rs.getLong("id");
            row.put("id", id);
            row.put("incentive_code", rs.getString("incentive_code"));
            row.put("name", rs.getString("name"));
            row.put("description", rs.getString("description"));
            row.put("incentive_type", rs.getString("incentive_type"));
            row.put("calculation_method", rs.getString("calculation_method"));
            row.put("amount", scaled(rs.getBigDecimal("amount")));
            row.put("currency_code", rs.getString("currency_code"));
            row.put("payroll_category", rs.getString("payroll_category"));
            row.put("tax_treatment", rs.getString("tax_treatment"));
            row.put("taxable", rs.getBoolean("taxable"));
            row.put("affects_social_security", rs.getBoolean("affects_social_security"));
            row.put("affects_employer_cost", rs.getBoolean("affects_employer_cost"));
            row.put("source_type", rs.getString("source_type"));
            row.put("source_reference_type", rs.getString("source_reference_type"));
            row.put("source_reference_id", rs.getString("source_reference_id"));
            row.put("effective_start_date", String.valueOf(rs.getObject("effective_start_date", LocalDate.class)));
            var effectiveEndDate = rs.getObject("effective_end_date", LocalDate.class);
            row.put("effective_end_date", effectiveEndDate == null ? null : String.valueOf(effectiveEndDate));
            row.put("application_mode", rs.getString("application_mode"));
            row.put("status", rs.getString("status"));
            row.put("eligible_count", rs.getLong("eligible_count"));
            row.put("applied_count", rs.getLong("applied_count"));
            row.put("scope_summary", scopeSummary(id));
            return row;
        }, params.toArray());

        var summary = new LinkedHashMap<String, Object>();
        summary.put("total_count", rows.size());
        summary.put("active_count", countBy(rows, "status", "active"));
        summary.put("scheduled_count", countBy(rows, "status", "scheduled"));
        summary.put("paused_count", countBy(rows, "status", "paused"));
        summary.put("manual_count", countBy(rows, "incentive_type", "manual"));
        summary.put("automated_count", countBy(rows, "incentive_type", "kpi"));
        summary.put("eligible_count", rows.stream().mapToLong(row -> asLong(row.get("eligible_count"))).sum());

        var result = new LinkedHashMap<String, Object>();
        result.put("rows", rows);
        result.put("summary", summary);
        return result;
    }

    @Transactional
    public Map<String, Object> createIncentive(AuthSessionUser currentUser, Map<String, Object> payload) {
        var name = stringValue(payload, "name", "nombre");
        if (name.isBlank()) {
            throw new IllegalArgumentException("name is required.");
        }

        var amount = scaled(parseBigDecimal(payload, "amount", "monto"));
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("amount must be greater than zero.");
        }

        var incentiveType = normalizeType(stringValue(payload, "incentive_type", "type"));
        if (incentiveType.isBlank()) {
            incentiveType = "manual";
        }
        var currency = normalizeCurrency(stringValue(payload, "currency_code", "currency"), "MXN");
        var status = normalizeStatus(stringValue(payload, "status"), "active");
        var effectiveStartDate = parseDate(payload, "effective_start_date", "start_date");
        if (effectiveStartDate == null) {
            effectiveStartDate = LocalDate.now();
        }
        var effectiveEndDate = parseDate(payload, "effective_end_date", "end_date");
        if (effectiveEndDate != null && effectiveEndDate.isBefore(effectiveStartDate)) {
            throw new IllegalArgumentException("effective_end_date must be after effective_start_date.");
        }

        var sourceReferenceType = stringValue(payload, "source_reference_type");
        if (sourceReferenceType.isBlank() && "kpi".equals(incentiveType)) {
            sourceReferenceType = "kpi";
        }
        var sourceReferenceId = stringValue(payload, "source_reference_id");
        var description = stringValue(payload, "description", "concepto");
        var applicationMode = normalizeApplicationMode(stringValue(payload, "application_mode"));

        var keyHolder = new GeneratedKeyHolder();
        final var finalCompanyId = currentUser.companyId();
        final var finalUserId = currentUser.userId();
        final var finalName = name;
        final var finalAmount = amount;
        final var finalIncentiveType = incentiveType;
        final var finalCurrency = currency;
        final var finalStatus = status;
        final var finalDescription = description;
        final var finalApplicationMode = applicationMode;
        final var finalEffectiveStartDate = effectiveStartDate;
        final var finalEffectiveEndDate = effectiveEndDate;
        final var finalSourceReferenceType = sourceReferenceType;
        final var finalSourceReferenceId = sourceReferenceId;

        jdbcTemplate.update((Connection connection) -> {
            PreparedStatement ps = connection.prepareStatement(
                """
                    INSERT INTO hr_incentives
                    (company_id, incentive_code, name, description, incentive_type, calculation_method, amount, currency_code,
                     payroll_category, tax_treatment, taxable, affects_social_security, affects_employer_cost, source_type,
                     source_reference_type, source_reference_id, effective_start_date, effective_end_date, application_mode,
                     status, created_by_user_id, approved_by_user_id, approved_at, metadata_json)
                    VALUES (?, ?, ?, ?, ?, 'fixed_amount', ?, ?, 'earning', 'taxable_compensation', 1, 1, 0, 'incentive',
                            ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
                    """,
                Statement.RETURN_GENERATED_KEYS
            );
            ps.setLong(1, finalCompanyId);
            ps.setString(2, "PENDING-" + System.nanoTime());
            ps.setString(3, finalName);
            ps.setString(4, nullable(finalDescription));
            ps.setString(5, finalIncentiveType);
            ps.setBigDecimal(6, finalAmount);
            ps.setString(7, finalCurrency);
            ps.setString(8, nullable(finalSourceReferenceType));
            ps.setString(9, nullable(finalSourceReferenceId));
            ps.setDate(10, Date.valueOf(finalEffectiveStartDate));
            if (finalEffectiveEndDate == null) {
                ps.setDate(11, null);
            } else {
                ps.setDate(11, Date.valueOf(finalEffectiveEndDate));
            }
            ps.setString(12, finalApplicationMode);
            ps.setString(13, finalStatus);
            ps.setLong(14, finalUserId);
            ps.setLong(15, finalUserId);
            ps.setString(16, metadataJson(finalCurrency, finalCurrency, finalAmount, finalAmount, BigDecimal.ONE));
            return ps;
        }, keyHolder);

        var incentiveId = keyHolder.getKey().longValue();
        var code = "INC-%06d".formatted(incentiveId);
        jdbcTemplate.update("UPDATE hr_incentives SET incentive_code = ? WHERE id = ?", code, incentiveId);

        var scopeType = normalizeScopeType(stringValue(payload, "scope_type"));
        var employeeIds = longList(payload, "target_user_company_ids", "employee_ids", "colaboradoresSeleccionados");
        var unitIds = longList(payload, "target_unit_ids", "unit_ids");
        var businessIds = longList(payload, "target_business_ids", "business_ids");

        insertAssignments(incentiveId, currentUser.companyId(), scopeType, employeeIds, unitIds, businessIds);
        if (!"paused".equals(status)) {
            var targets = targetEmployees(currentUser.companyId(), scopeType, employeeIds, unitIds, businessIds);
            if (targets.isEmpty()) {
                throw new IllegalArgumentException("No eligible collaborators were found for this incentive.");
            }
            var applicationEndDate = "next_payroll".equals(applicationMode) && effectiveEndDate == null
                ? NEXT_PAYROLL_OPEN_END_DATE
                : (effectiveEndDate == null ? effectiveStartDate : effectiveEndDate);
            createApplications(
                currentUser.companyId(),
                incentiveId,
                targets,
                amount,
                currency,
                effectiveStartDate,
                applicationEndDate,
                finalSourceReferenceType,
                finalSourceReferenceId
            );
        }

        return getIncentive(currentUser, incentiveId);
    }

    public Map<String, Object> getIncentive(AuthSessionUser currentUser, long incentiveId) {
        var result = listIncentives(currentUser, Map.of());
        @SuppressWarnings("unchecked")
        var rows = (List<Map<String, Object>>) result.get("rows");
        return rows.stream()
            .filter(row -> asLong(row.get("id")) == incentiveId)
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("Incentive not found."));
    }

    @Transactional
    public void cancelIncentive(AuthSessionUser currentUser, long incentiveId) {
        var updated = jdbcTemplate.update(
            "UPDATE hr_incentives SET status = 'paused' WHERE id = ? AND company_id = ? AND COALESCE(source_type, 'incentive') <> 'petty_cash_shortage'",
            incentiveId,
            currentUser.companyId()
        );
        if (updated == 0) {
            throw new NoSuchElementException("Incentive not found.");
        }
        jdbcTemplate.update(
            "UPDATE hr_incentive_applications SET status = 'cancelled' WHERE incentive_id = ? AND company_id = ? AND status = 'approved'",
            incentiveId,
            currentUser.companyId()
        );
    }

    private void insertAssignments(
        long incentiveId,
        long companyId,
        String scopeType,
        List<Long> employeeIds,
        List<Long> unitIds,
        List<Long> businessIds
    ) {
        if ("employees".equals(scopeType) && !employeeIds.isEmpty()) {
            employeeIds.forEach(userCompanyId -> insertAssignment(incentiveId, companyId, "employee", userCompanyId, null, null));
            return;
        }
        if ("units".equals(scopeType) && !unitIds.isEmpty()) {
            unitIds.forEach(unitId -> insertAssignment(incentiveId, companyId, "unit", null, unitId, null));
            return;
        }
        if ("businesses".equals(scopeType) && !businessIds.isEmpty()) {
            businessIds.forEach(businessId -> insertAssignment(incentiveId, companyId, "business", null, null, businessId));
            return;
        }
        insertAssignment(incentiveId, companyId, "all", null, null, null);
    }

    private void insertAssignment(Long incentiveId, long companyId, String type, Long userCompanyId, Long unitId, Long businessId) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_incentive_assignments
                (incentive_id, company_id, assignment_type, user_company_id, unit_id, business_id)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
            incentiveId,
            companyId,
            type,
            userCompanyId,
            unitId,
            businessId
        );
    }

    private List<TargetEmployee> targetEmployees(
        long companyId,
        String scopeType,
        List<Long> employeeIds,
        List<Long> unitIds,
        List<Long> businessIds
    ) {
        var sql = new StringBuilder(
            """
                SELECT uc.id AS user_company_id,
                       COALESCE(MAX(wp.registration_country), '') AS registration_country
                FROM user_companies uc
                LEFT JOIN user_work_profiles wp ON wp.user_company_id = uc.id AND wp.company_id = uc.company_id
                WHERE uc.company_id = ?
                  AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                """
        );
        var params = new ArrayList<Object>();
        params.add(companyId);

        if ("employees".equals(scopeType) && !employeeIds.isEmpty()) {
            appendInClause(sql, "uc.id", employeeIds, params);
        } else if ("units".equals(scopeType) && !unitIds.isEmpty()) {
            appendInClause(sql, "wp.unit_id", unitIds, params);
        } else if ("businesses".equals(scopeType) && !businessIds.isEmpty()) {
            appendInClause(sql, "wp.business_id", businessIds, params);
        }
        sql.append(" GROUP BY uc.id ORDER BY uc.id ASC");

        return jdbcTemplate.query(
            sql.toString(),
            (rs, rowNum) -> new TargetEmployee(rs.getLong("user_company_id"), rs.getString("registration_country")),
            params.toArray()
        );
    }

    private void createApplications(
        long companyId,
        long incentiveId,
        List<TargetEmployee> targets,
        BigDecimal amount,
        String enteredCurrency,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        String sourceReferenceType,
        String sourceReferenceId
    ) {
        for (var target : targets) {
            var payrollCurrency = resolveCurrencyCode(target.registrationCountry(), enteredCurrency);
            var fxRate = exchangeRateBetween(enteredCurrency, payrollCurrency);
            var applicationAmount = scaled(amount.multiply(fxRate));
            jdbcTemplate.update(
                """
                    INSERT INTO hr_incentive_applications
                    (company_id, incentive_id, user_company_id, period_start_date, period_end_date, amount, currency_code,
                     payroll_category, tax_treatment, taxable, affects_social_security, affects_employer_cost, source_type,
                     source_reference_type, source_reference_id, status, calculation_snapshot_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'earning', 'taxable_compensation', 1, 1, 0, 'incentive', ?, ?, 'approved', ?)
                    """,
                companyId,
                incentiveId,
                target.userCompanyId(),
                periodStartDate,
                periodEndDate,
                applicationAmount,
                payrollCurrency,
                nullable(sourceReferenceType),
                nullable(sourceReferenceId),
                metadataJson(enteredCurrency, payrollCurrency, amount, applicationAmount, fxRate)
            );
        }
    }

    private String scopeSummary(long incentiveId) {
        var rows = jdbcTemplate.queryForList(
            """
                SELECT assignment_type, COUNT(*) AS total
                FROM hr_incentive_assignments
                WHERE incentive_id = ?
                GROUP BY assignment_type
                """,
            incentiveId
        );
        if (rows.isEmpty()) {
            return "Sin alcance";
        }
        for (var row : rows) {
            if ("all".equals(row.get("assignment_type"))) {
                return "Todo el personal";
            }
        }
        var total = rows.stream().mapToLong(row -> asLong(row.get("total"))).sum();
        var type = String.valueOf(rows.getFirst().get("assignment_type"));
        return switch (type) {
            case "unit" -> total + (total == 1 ? " unidad" : " unidades");
            case "business" -> total + (total == 1 ? " negocio" : " negocios");
            default -> total + (total == 1 ? " colaborador" : " colaboradores");
        };
    }

    private void appendInClause(StringBuilder sql, String column, List<Long> values, List<Object> params) {
        sql.append(" AND ").append(column).append(" IN (");
        sql.append("?,".repeat(values.size()));
        sql.setLength(sql.length() - 1);
        sql.append(")");
        params.addAll(values);
    }

    private long countBy(List<LinkedHashMap<String, Object>> rows, String field, String value) {
        return rows.stream().filter(row -> value.equals(row.get(field))).count();
    }

    private BigDecimal scaled(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizeType(String value) {
        var normalized = value(value).toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "automatizado", "automated", "kpi", "rule" -> "kpi";
            case "manual", "", "all", "todos" -> normalized;
            default -> throw new IllegalArgumentException("incentive_type must be manual or kpi.");
        };
    }

    private String normalizeStatus(String value, String fallback) {
        var normalized = value(value).toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        if (normalized.isBlank()) {
            return fallback;
        }
        return switch (normalized) {
            case "active", "activo" -> "active";
            case "scheduled", "programado" -> "scheduled";
            case "paused", "pausado", "inactive", "inactivo", "cancelled", "canceled" -> "paused";
            case "all", "todos" -> "all";
            default -> throw new IllegalArgumentException("status must be active, scheduled, or paused.");
        };
    }

    private String normalizeScopeType(String value) {
        var normalized = value(value).toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "employee", "employees", "colaborador", "colaboradores" -> "employees";
            case "unit", "units", "unidad", "unidades" -> "units";
            case "business", "businesses", "negocio", "negocios" -> "businesses";
            default -> "all";
        };
    }

    private String normalizeApplicationMode(String value) {
        var normalized = value(value).toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "specific", "specific_date", "fecha_especifica" -> "specific_date";
            case "next_payroll", "siguiente", "siguiente_nomina", "" -> "next_payroll";
            default -> "next_payroll";
        };
    }

    private static String normalizeCurrency(String value, String fallback) {
        var normalized = value(value).toUpperCase(Locale.ROOT);
        if (normalized.length() != 3) {
            return fallback;
        }
        return normalized;
    }

    private String resolveCurrencyCode(String country, String fallback) {
        return switch (value(country).toUpperCase(Locale.ROOT).replace(" ", "")) {
            case "BR", "BRAZIL", "BRASIL" -> "BRL";
            case "CA", "CANADA" -> "CAD";
            case "CO", "COLOMBIA" -> "COP";
            case "MX", "MEXICO", "MÉXICO" -> "MXN";
            case "US", "USA", "UNITEDSTATES", "UNITED STATES" -> "USD";
            default -> fallback;
        };
    }

    static BigDecimal exchangeRateBetween(String sourceCurrency, String targetCurrency) {
        var sourceRate = DEFAULT_EXCHANGE_RATES_PER_USD.get(normalizeCurrency(sourceCurrency, "USD"));
        var targetRate = DEFAULT_EXCHANGE_RATES_PER_USD.get(normalizeCurrency(targetCurrency, "USD"));
        if (sourceRate == null || targetRate == null || sourceRate.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ONE;
        }
        return targetRate.divide(sourceRate, 10, RoundingMode.HALF_UP);
    }

    private String metadataJson(
        String enteredCurrency,
        String appliedCurrency,
        BigDecimal enteredAmount,
        BigDecimal appliedAmount,
        BigDecimal fxRate
    ) {
        var normalizedEnteredCurrency = normalizeCurrency(enteredCurrency, "MXN");
        var normalizedAppliedCurrency = normalizeCurrency(appliedCurrency, normalizedEnteredCurrency);
        return "{\"source\":\"hr_incentives\",\"entered_currency\":\""
            + normalizedEnteredCurrency
            + "\",\"applied_currency\":\""
            + normalizedAppliedCurrency
            + "\",\"entered_amount\":\""
            + scaled(enteredAmount).toPlainString()
            + "\",\"applied_amount\":\""
            + scaled(appliedAmount).toPlainString()
            + "\",\"fx_rate\":\""
            + fxRate.setScale(10, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString()
            + "\",\"fx_base_currency\":\"USD\",\"fx_source\":\"internal_daily_reference\",\"native_currency_applied\":"
            + !normalizedAppliedCurrency.equalsIgnoreCase(normalizedEnteredCurrency)
            + "}";
    }

    private String nullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String value(String value) {
        return value == null ? "" : value.trim();
    }

    private long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value == null) {
            return 0L;
        }
        return Long.parseLong(String.valueOf(value));
    }

    private record TargetEmployee(long userCompanyId, String registrationCountry) {
    }
}
