package com.indice.erp.finance.shared;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.text.Normalizer;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Reads the company's headquarters country; currency and interface language are never country evidence. */
@Service
public class FinanceCompanyCountryResolver {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    public FinanceCompanyCountryResolver(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }
    public String resolve(long companyId) {
        var settings = jdbc.query("SELECT settings_json FROM company_settings WHERE company_id = ?",
            (rs, index) -> rs.getString(1), companyId);
        if (settings.isEmpty() || settings.getFirst() == null) return "";
        try {
            return fromSettings(mapper.readTree(settings.getFirst()));
        } catch (Exception exception) {
            throw new IllegalStateException("Company country settings cannot be read.", exception);
        }
    }
    public static String fromSettings(JsonNode root) {
        var config = root.path("config_center");
        var template = config.path("empresa_template");
        for (var value : new JsonNode[] {template.path("fiscalCountry"), template.path("address").path("country"),
                template.path("country"), template.path("pais")}) {
            var country = normalize(value.asText(""));
            if (!country.isEmpty()) return country;
        }
        for (var unit : config.path("map")) {
            if (unit.path("is_corporate_office").asBoolean() || unit.path("isCorporateOffice").asBoolean()) {
                var country = normalize(unit.path("pais").asText(unit.path("country").asText("")));
                if (!country.isEmpty()) return country;
            }
        }
        return "";
    }
    private static String normalize(String value) {
        var normalized = Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "").toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "MX", "MEX", "MEXICO" -> "MX";
            case "CA", "CAN", "CANADA" -> "CA";
            case "US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA", "ESTADOS UNIDOS" -> "US";
            case "CO", "COL", "COLOMBIA" -> "CO";
            case "BR", "BRA", "BRASIL", "BRAZIL" -> "BR";
            default -> "";
        };
    }
}
