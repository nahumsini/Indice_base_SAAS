package com.indice.erp.sales.kpis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.LinkedHashSet;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
class SalesBusinessTimeZoneResolver {

    private final SalesKpiTodayRepository repository;
    private final ObjectMapper objectMapper;
    private final ZoneId fallbackZone;

    SalesBusinessTimeZoneResolver(
        SalesKpiTodayRepository repository,
        ObjectMapper objectMapper,
        @Value("${app.sales.default-business-timezone:America/Toronto}") String fallbackTimezone
    ) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.fallbackZone = parseRequired(fallbackTimezone, "app.sales.default-business-timezone");
    }

    ZoneId resolve(long companyId) {
        var configured = repository.companySettingsJson(companyId).flatMap(this::configuredCompanyTimezone);
        if (configured.isPresent()) {
            return parseRequired(configured.get(), "company timezone");
        }

        var operationalZones = new LinkedHashSet<ZoneId>();
        for (var value : repository.operationalTimezones(companyId)) {
            if (value != null && !value.isBlank()) {
                operationalZones.add(parseRequired(value, "operational timezone"));
            }
        }
        return operationalZones.size() == 1 ? operationalZones.iterator().next() : fallbackZone;
    }

    private Optional<String> configuredCompanyTimezone(String settingsJson) {
        try {
            var root = objectMapper.readTree(settingsJson);
            var configCenter = root.path("config_center");
            var template = configCenter.path("empresa_template");
            var direct = firstText(template, "timezone", "zona_horaria");
            if (direct.isPresent()) {
                return direct;
            }

            var legacyZones = new LinkedHashSet<String>();
            var map = configCenter.path("map");
            if (map.isArray()) {
                for (var node : map) {
                    firstText(node, "timezone", "zona_horaria").ifPresent(legacyZones::add);
                }
            }
            return legacyZones.size() == 1 ? Optional.of(legacyZones.iterator().next()) : Optional.empty();
        } catch (Exception exception) {
            throw new IllegalStateException("Company timezone settings are not valid JSON.", exception);
        }
    }

    private Optional<String> firstText(JsonNode node, String... fieldNames) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return Optional.empty();
        }
        for (var fieldName : fieldNames) {
            var value = node.path(fieldName);
            if (value.isTextual() && !value.asText().isBlank()) {
                return Optional.of(value.asText().trim());
            }
        }
        return Optional.empty();
    }

    private static ZoneId parseRequired(String value, String label) {
        try {
            return ZoneId.of(value == null ? "" : value.trim());
        } catch (DateTimeException exception) {
            throw new IllegalStateException(label + " is not a valid IANA timezone.", exception);
        }
    }
}
