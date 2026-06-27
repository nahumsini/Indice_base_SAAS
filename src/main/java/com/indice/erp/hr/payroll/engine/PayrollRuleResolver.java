package com.indice.erp.hr.payroll.engine;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class PayrollRuleResolver {

    private final JdbcTemplate jdbcTemplate;

    public PayrollRuleResolver(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public RuleSet resolveRuleSet(String countryCode, String provinceCode, String ruleCode, LocalDate effectiveDate) {
        var exact = queryRuleSet(countryCode, provinceCode, ruleCode, effectiveDate);
        if (exact != null) {
            return exact;
        }
        if (!normalizeProvince(provinceCode).isBlank()) {
            return queryRuleSet(countryCode, "", ruleCode, effectiveDate);
        }
        return null;
    }

    public Map<String, BigDecimal> parametersByCode(
        String countryCode,
        String provinceCode,
        String ruleCode,
        LocalDate effectiveDate
    ) {
        var ruleSet = resolveRuleSet(countryCode, provinceCode, ruleCode, effectiveDate);
        return ruleSet == null ? Map.of() : parameters(ruleSet.id());
    }

    public List<RuleBracket> bracketsByCode(
        String countryCode,
        String provinceCode,
        String ruleCode,
        LocalDate effectiveDate
    ) {
        var ruleSet = resolveRuleSet(countryCode, provinceCode, ruleCode, effectiveDate);
        return ruleSet == null ? List.of() : brackets(ruleSet.id());
    }

    public Map<String, BigDecimal> parameters(long ruleSetId) {
        return jdbcTemplate.query(
            """
                SELECT parameter_key, parameter_value
                FROM payroll_rule_parameters
                WHERE rule_set_id = ?
                ORDER BY display_order ASC, id ASC
                """,
            (rs, rowNum) -> Map.entry(
                safe(rs.getString("parameter_key")),
                decimal(rs.getBigDecimal("parameter_value"))
            ),
            ruleSetId
        ).stream().collect(
            LinkedHashMap::new,
            (map, entry) -> map.put(entry.getKey(), entry.getValue()),
            LinkedHashMap::putAll
        );
    }

    public List<RuleBracket> brackets(long ruleSetId) {
        return jdbcTemplate.query(
            """
                SELECT lower_limit,
                       upper_limit,
                       fixed_amount,
                       rate,
                       constant_amount,
                       display_order
                FROM payroll_rule_brackets
                WHERE rule_set_id = ?
                ORDER BY display_order ASC, id ASC
                """,
            (rs, rowNum) -> new RuleBracket(
                decimal(rs.getBigDecimal("lower_limit")),
                rs.getBigDecimal("upper_limit") == null ? null : decimal(rs.getBigDecimal("upper_limit")),
                decimal(rs.getBigDecimal("fixed_amount")),
                decimal(rs.getBigDecimal("rate")),
                decimal(rs.getBigDecimal("constant_amount")),
                rs.getInt("display_order")
            ),
            ruleSetId
        );
    }

    public BigDecimal decimalParam(Map<String, BigDecimal> params, String key, BigDecimal fallback) {
        var value = params.get(key);
        return value == null ? fallback : value;
    }

    public Map<String, Object> ruleReferenceSnapshot(List<PayrollCalculatedLineItem> items) {
        return ruleReferenceSnapshot(items, LocalDate.now());
    }

    public Map<String, Object> ruleReferenceSnapshot(List<PayrollCalculatedLineItem> items, LocalDate effectiveDate) {
        var references = new LinkedHashMap<String, Map<String, Object>>();
        var itemSnapshots = new ArrayList<Map<String, Object>>();
        for (var item : items) {
            itemSnapshots.add(lineItemSnapshot(item));
            if (item.ruleSetId() == null || item.ruleCode().isBlank()) {
                continue;
            }
            var ruleSet = ruleSet(item.ruleSetId());
            if (ruleSet == null) {
                references.putIfAbsent(item.ruleCode() + ":" + item.ruleSetId(), Map.of(
                    "ruleCode", item.ruleCode(),
                    "ruleSetId", item.ruleSetId(),
                    "countryCode", item.countryCode(),
                    "jurisdictionCode", item.jurisdictionCode(),
                    "missingRuleSet", true
                ));
                continue;
            }
            references.putIfAbsent(
                item.ruleCode() + ":" + item.ruleSetId(),
                ruleSetSnapshot(ruleSet, effectiveDate)
            );
        }
        return Map.of(
            "effectiveDate", (effectiveDate == null ? LocalDate.now() : effectiveDate).toString(),
            "rules", List.copyOf(references.values()),
            "lineItems", List.copyOf(itemSnapshots)
        );
    }

    public RuleSet ruleSet(long ruleSetId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id,
                       country_code,
                       province_code,
                       rule_code,
                       rule_name,
                       rule_category,
                       effective_from,
                       effective_to,
                       version_label,
                       source_name,
                       source_url,
                       is_official,
                       updated_at
                FROM payroll_rule_sets
                WHERE id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new RuleSet(
                rs.getLong("id"),
                safe(rs.getString("country_code")),
                safe(rs.getString("province_code")),
                safe(rs.getString("rule_code")),
                safe(rs.getString("rule_name")),
                safe(rs.getString("rule_category")),
                rs.getDate("effective_from") == null ? null : rs.getDate("effective_from").toLocalDate(),
                rs.getDate("effective_to") == null ? null : rs.getDate("effective_to").toLocalDate(),
                safe(rs.getString("version_label")),
                safe(rs.getString("source_name")),
                safe(rs.getString("source_url")),
                rs.getBoolean("is_official"),
                toLocalDateTime(rs.getTimestamp("updated_at"))
            ),
            ruleSetId
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public List<RuleParameter> parameterDetails(long ruleSetId) {
        return jdbcTemplate.query(
            """
                SELECT parameter_key,
                       parameter_value,
                       value_type,
                       unit_label,
                       display_order
                FROM payroll_rule_parameters
                WHERE rule_set_id = ?
                ORDER BY display_order ASC, id ASC
                """,
            (rs, rowNum) -> new RuleParameter(
                safe(rs.getString("parameter_key")),
                decimal(rs.getBigDecimal("parameter_value")),
                safe(rs.getString("value_type")),
                safe(rs.getString("unit_label")),
                rs.getInt("display_order")
            ),
            ruleSetId
        );
    }

    private RuleSet queryRuleSet(String countryCode, String provinceCode, String ruleCode, LocalDate effectiveDate) {
        var resolvedDate = effectiveDate == null ? LocalDate.now() : effectiveDate;
        var rows = jdbcTemplate.query(
            """
                SELECT id,
                       country_code,
                       province_code,
                       rule_code,
                       rule_name,
                       rule_category,
                       effective_from,
                       effective_to,
                       version_label,
                       source_name,
                       source_url,
                       is_official,
                       updated_at
                FROM payroll_rule_sets
                WHERE country_code = ?
                  AND province_code = ?
                  AND rule_code = ?
                  AND effective_from <= ?
                  AND (effective_to IS NULL OR effective_to >= ?)
                  AND is_active = 1
                ORDER BY effective_from DESC, id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new RuleSet(
                rs.getLong("id"),
                safe(rs.getString("country_code")),
                safe(rs.getString("province_code")),
                safe(rs.getString("rule_code")),
                safe(rs.getString("rule_name")),
                safe(rs.getString("rule_category")),
                rs.getDate("effective_from") == null ? null : rs.getDate("effective_from").toLocalDate(),
                rs.getDate("effective_to") == null ? null : rs.getDate("effective_to").toLocalDate(),
                safe(rs.getString("version_label")),
                safe(rs.getString("source_name")),
                safe(rs.getString("source_url")),
                rs.getBoolean("is_official"),
                toLocalDateTime(rs.getTimestamp("updated_at"))
            ),
            normalizeCountry(countryCode),
            normalizeProvince(provinceCode),
            safe(ruleCode).trim().toUpperCase(Locale.ROOT),
            resolvedDate,
            resolvedDate
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private Map<String, Object> ruleSetSnapshot(RuleSet ruleSet, LocalDate effectiveDate) {
        var body = new LinkedHashMap<String, Object>();
        body.put("ruleSetId", ruleSet.id());
        body.put("ruleSetCode", ruleSet.ruleCode());
        body.put("ruleSetCountry", ruleSet.countryCode());
        body.put("jurisdiction", ruleSet.provinceCode());
        body.put("ruleName", ruleSet.ruleName());
        body.put("ruleCategory", ruleSet.ruleCategory());
        body.put("effectiveDate", (effectiveDate == null ? LocalDate.now() : effectiveDate).toString());
        body.put("validFrom", ruleSet.effectiveFrom() == null ? null : ruleSet.effectiveFrom().toString());
        body.put("validTo", ruleSet.effectiveTo() == null ? null : ruleSet.effectiveTo().toString());
        body.put("versionLabel", ruleSet.versionLabel());
        body.put("source", ruleSet.sourceName());
        body.put("sourceUrl", ruleSet.sourceUrl());
        body.put("official", ruleSet.official());
        body.put("updatedAt", ruleSet.updatedAt() == null ? null : ruleSet.updatedAt().toString());
        body.put("parameters", parameterDetails(ruleSet.id()).stream().map(this::parameterSnapshot).toList());
        body.put("brackets", brackets(ruleSet.id()).stream().map(this::bracketSnapshot).toList());
        return body;
    }

    private Map<String, Object> lineItemSnapshot(PayrollCalculatedLineItem item) {
        var body = new LinkedHashMap<String, Object>();
        body.put("itemCode", item.code());
        body.put("itemType", item.category());
        body.put("label", item.label());
        body.put("sourceType", item.sourceType());
        body.put("countryCode", item.countryCode());
        body.put("jurisdictionCode", item.jurisdictionCode());
        body.put("legalClassification", item.legalClassification());
        body.put("taxTreatment", item.taxTreatment());
        body.put("taxable", item.taxable());
        body.put("exempt", item.exempt());
        body.put("affectsSocialSecurity", item.affectsSocialSecurity());
        body.put("affectsEmployerCost", item.affectsEmployerCost());
        body.put("ruleCode", item.ruleCode());
        body.put("ruleSetId", item.ruleSetId());
        body.put("calculationFormula", item.calculationFormula());
        body.put("calculationBase", item.calculationBase());
        body.put("rateApplied", item.rateApplied());
        body.put("currencyCode", item.currencyCode());
        body.put("resultAmount", item.amount());
        return body;
    }

    private Map<String, Object> parameterSnapshot(RuleParameter parameter) {
        var body = new LinkedHashMap<String, Object>();
        body.put("name", parameter.key());
        body.put("value", parameter.value());
        body.put("type", parameter.valueType());
        body.put("unit", parameter.unitLabel());
        body.put("displayOrder", parameter.displayOrder());
        return body;
    }

    private Map<String, Object> bracketSnapshot(RuleBracket bracket) {
        var body = new LinkedHashMap<String, Object>();
        body.put("lowerLimit", bracket.lowerLimit());
        body.put("upperLimit", bracket.upperLimit());
        body.put("rate", bracket.rate());
        body.put("fixedFee", bracket.fixedAmount());
        body.put("constantAmount", bracket.constantAmount());
        body.put("displayOrder", bracket.displayOrder());
        body.put("label", "bracket_" + bracket.displayOrder());
        return body;
    }

    public String normalizeCountry(String countryCode) {
        var normalized = safe(countryCode).trim().toUpperCase(Locale.ROOT).replace("É", "E");
        return switch (normalized) {
            case "MEX", "MEXICO" -> "MX";
            case "CAN", "CANADA" -> "CA";
            case "USA", "UNITED STATES", "UNITEDSTATES", "UNITED STATES OF AMERICA", "ESTADOS UNIDOS" -> "US";
            case "BRA", "BRAZIL", "BRASIL" -> "BR";
            case "COL", "COLOMBIA" -> "CO";
            default -> normalized;
        };
    }

    public String normalizeProvince(String provinceCode) {
        return safe(provinceCode).trim().toUpperCase(Locale.ROOT).replace(".", "").replace("_", "-");
    }

    private static String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private static BigDecimal decimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.stripTrailingZeros();
    }

    private static LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    public record RuleSet(
        long id,
        String countryCode,
        String provinceCode,
        String ruleCode,
        String ruleName,
        String ruleCategory,
        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        String versionLabel,
        String sourceName,
        String sourceUrl,
        boolean official,
        LocalDateTime updatedAt
    ) {
    }

    public record RuleParameter(
        String key,
        BigDecimal value,
        String valueType,
        String unitLabel,
        int displayOrder
    ) {
    }

    public record RuleBracket(
        BigDecimal lowerLimit,
        BigDecimal upperLimit,
        BigDecimal fixedAmount,
        BigDecimal rate,
        BigDecimal constantAmount,
        int displayOrder
    ) {
    }
}
