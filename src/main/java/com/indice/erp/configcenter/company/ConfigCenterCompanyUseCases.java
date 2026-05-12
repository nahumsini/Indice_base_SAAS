package com.indice.erp.configcenter.company;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.configcenter.invitations.ConfigCenterInvitationUseCases;
import com.indice.erp.configcenter.support.BusinessInput;
import com.indice.erp.configcenter.support.CoordinateInput;
import com.indice.erp.configcenter.support.UnitInput;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

public abstract class ConfigCenterCompanyUseCases extends ConfigCenterInvitationUseCases {

    protected ConfigCenterCompanyUseCases(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        BCryptPasswordEncoder passwordEncoder,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties
    ) {
        super(jdbcTemplate, objectMapper, passwordEncoder, objectStorageService, objectStorageProperties);
    }

    public Map<String, Object> getEmpresa(long companyId) {
        var companyRows = jdbcTemplate.query(
            "SELECT id, name, logo_url FROM companies WHERE id = ? LIMIT 1",
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("nombre_empresa", safe(rs.getString("name")));
                row.put("logo_url", safe(rs.getString("logo_url")));
                return row;
            },
            companyId
        );

        if (companyRows.isEmpty()) {
            throw new IllegalArgumentException("Company not found.");
        }

        var settingsRoot = loadSettingsRoot(companyId);
        var configCenterNode = settingsRoot.path(CONFIG_CENTER_KEY);
        var empresaTemplate = normalizeEmpresaTemplate(configCenterNode.path("empresa_template"));
        var mapNode = configCenterNode.path("map");
        var storedMap = normalizeStoredMap(mapNode);
        var map = mapNode.isArray() ? storedMap : normalizeStoredCorporateOfficeMap(buildStructureMap(companyId));

        var estructura = firstNonBlank(
            readOptionalText(configCenterNode, "estructura"),
            map.isEmpty() ? "simple" : "multi"
        );

        var empresa = new LinkedHashMap<>(companyRows.get(0));
        if (configCenterNode.path("empresa_template").has("logo")) {
            empresa.put("logo_url", configCenterNode.path("empresa_template").path("logo").asText("").trim());
        } else {
            empresa.put("logo_url", firstNonBlank(
                objectString(empresa.get("logo_url")),
                readOptionalText(configCenterNode.path("empresa_template"), "logo_url")
            ));
        }
        empresa.put("plan_id", null);
        empresa.put("industria", firstNonBlank(
            stringValue(empresaTemplate.get("industria")),
            readOptionalText(configCenterNode.path("empresa_template"), "industria")
        ));
        empresa.put("modelo_negocio", firstNonBlank(
            stringValue(empresaTemplate.get("modelo_negocio")),
            readOptionalText(configCenterNode.path("empresa_template"), "modelo_negocio")
        ));
        empresa.put("descripcion", firstNonBlank(
            stringValue(empresaTemplate.get("descripcion")),
            readOptionalText(configCenterNode.path("empresa_template"), "descripcion")
        ));
        empresa.put("moneda", firstNonBlank(
            stringValue(empresaTemplate.get("currency")),
            readOptionalText(configCenterNode.path("empresa_template"), "moneda")
        ));
        empresa.put("zona_horaria", firstNonBlank(
            stringValue(empresaTemplate.get("timezone")),
            readOptionalText(configCenterNode.path("empresa_template"), "zona_horaria")
        ));
        empresa.put("tamano_empresa", firstNonBlank(
            stringValue(empresaTemplate.get("tamano_empresa")),
            readOptionalText(configCenterNode, "tamano_empresa")
        ));
        putIfPresent(empresa, "latitude", empresaTemplate.get("latitude"));
        putIfPresent(empresa, "longitude", empresaTemplate.get("longitude"));
        putIfPresent(empresa, "radius_meters", empresaTemplate.get("radius_meters"));
        putIfPresent(empresa, "coordinate_source", empresaTemplate.get("coordinate_source"));
        putIfPresent(empresa, "google_maps_url", empresaTemplate.get("google_maps_url"));
        putIfPresent(empresa, ADDRESS_KEY, empresaTemplate.get(ADDRESS_KEY));
        putIfPresent(empresa, HEADQUARTERS_LOCATION_KEY, empresaTemplate.get(HEADQUARTERS_LOCATION_KEY));
        empresa.put("colaboradores", resolveCollaborators(companyId, readOptionalInt(configCenterNode, "colaboradores")));
        empresa.put("estructura", "multi".equals(estructura) ? "multi" : "simple");
        empresa.put("empresa_template", empresaTemplate);
        empresa.put("map", map);
        return empresa;
    }

    public Object getConfig(long companyId) {
        var empresa = getEmpresa(companyId);
        var config = new LinkedHashMap<String, Object>();
        config.put("estructura", empresa.get("estructura"));
        config.put("colaboradores", empresa.get("colaboradores"));
        config.put("empresa_template", empresa.get("empresa_template"));
        config.put("map", empresa.get("map"));
        return config;
    }

    protected String loadCompanyName(long companyId) {
        var rows = jdbcTemplate.query(
            "SELECT name FROM companies WHERE id = ? LIMIT 1",
            (rs, rowNum) -> safe(rs.getString("name")),
            companyId
        );
        return rows.isEmpty() ? "" : rows.get(0);
    }

    protected boolean isHeadquartersName(String value) {
        var normalized = normalizeKey(value);
        return normalized.equals(normalizeKey(CORPORATE_OFFICE_UNIT_NAME))
            || normalized.equals(normalizeKey(HEADQUARTERS_UNIT_NAME))
            || normalized.equals(normalizeKey(LEGACY_HEADQUARTERS_UNIT_NAME));
    }

    public Map<String, Object> saveEmpresa(long companyId, long userId, Map<String, Object> payload) {
        var name = value(payload, "nombre_empresa");
        if (!name.isBlank()) {
            jdbcTemplate.update("UPDATE companies SET name = ? WHERE id = ?", name, companyId);
        }

        var settingsRoot = loadSettingsRoot(companyId);
        var configCenterNode = ensureConfigCenterNode(settingsRoot);
        var empresaTemplateNode = ensureObjectNode(configCenterNode, "empresa_template");

        if (hasAnyKey(payload, "logo_url", "logoUrl", "logo")) {
            empresaTemplateNode.put("logo", value(payload, "logo_url", "logoUrl", "logo"));
        }
        empresaTemplateNode.put("industria", value(payload, "industria"));
        empresaTemplateNode.put("modelo_negocio", value(payload, "modelo_negocio"));
        empresaTemplateNode.put("descripcion", value(payload, "descripcion"));
        empresaTemplateNode.put("currency", value(payload, "moneda"));
        empresaTemplateNode.put("timezone", value(payload, "zona_horaria", "tz"));
        empresaTemplateNode.put("tamano_empresa", value(payload, "tamano_empresa"));
        if (!name.isBlank()) {
            empresaTemplateNode.put("display_name", name);
        }
        CoordinateInput companyCoordinates = null;
        var hasCompanyCoordinatePayload = hasCoordinatePayload(payload);
        var hasHeadquartersLocationPayload = hasHeadquartersLocationPayload(payload);
        if (hasHeadquartersLocationPayload) {
            var headquartersLocation = normalizeHeadquartersLocationInput(payload);
            companyCoordinates = headquartersLocation.coordinates();
            hasCompanyCoordinatePayload = headquartersLocation.hasCoordinatePayload();
            putHeadquartersLocationInput(empresaTemplateNode, headquartersLocation);
        }

        if (!configCenterNode.hasNonNull("estructura")) {
            configCenterNode.put("estructura", buildStructureMap(companyId).isEmpty() ? "simple" : "multi");
        }
        if (!configCenterNode.has("map")) {
            configCenterNode.set("map", objectMapper.valueToTree(buildStructureMap(companyId)));
        }
        configCenterNode.put("tamano_empresa", value(payload, "tamano_empresa"));

        upsertSettingsRoot(companyId, settingsRoot);
        if (hasCompanyCoordinatePayload) {
            if (booleanValue(payload, true, "sync_company_location", "syncCompanyLocation")) {
                syncCompanyStructureAttendanceLocation(companyId, userId, name, companyCoordinates);
            } else {
                deactivateCompanyStructureAttendanceLocation(companyId);
            }
        }

        var data = new LinkedHashMap<String, Object>();
        data.put("nombre_empresa", name);
        data.put("logo_url", value(payload, "logo_url", "logoUrl", "logo"));
        data.put("industria", value(payload, "industria"));
        data.put("descripcion", value(payload, "descripcion"));
        data.put("tamano_empresa", value(payload, "tamano_empresa"));
        data.put("modelo_negocio", value(payload, "modelo_negocio"));
        data.put("moneda", value(payload, "moneda"));
        data.put("zona_horaria", value(payload, "zona_horaria", "tz"));
        putIfPresent(data, "latitude", readOptionalDecimal(payload, "latitude", "latitud"));
        putIfPresent(data, "longitude", readOptionalDecimal(payload, "longitude", "longitud", "lng"));
        putIfPresent(data, "radius_meters", readOptionalInteger(payload, "radius_meters", "radiusMeters", "radius", "radio"));
        putIfPresent(data, "coordinate_source", firstNonBlank(
            objectString(payload, "coordinate_source", "coordinateSource"),
            objectString(payload, "source")
        ));
        putIfPresent(data, "google_maps_url", objectString(payload, "google_maps_url", "googleMapsUrl", "map_url", "mapUrl"));
        if (hasHeadquartersLocationPayload) {
            var savedLocation = normalizeEmpresaTemplate(empresaTemplateNode).get(HEADQUARTERS_LOCATION_KEY);
            if (savedLocation instanceof Map<?, ?> savedLocationMap) {
                putIfPresent(data, HEADQUARTERS_LOCATION_KEY, savedLocationMap);
                putIfPresent(data, ADDRESS_KEY, savedLocationMap.get(ADDRESS_KEY));
                putIfPresent(data, "latitude", savedLocationMap.get("latitude"));
                putIfPresent(data, "longitude", savedLocationMap.get("longitude"));
                putIfPresent(data, "radius_meters", savedLocationMap.get("radius_meters"));
                putIfPresent(data, "coordinate_source", savedLocationMap.get("coordinate_source"));
                putIfPresent(data, "google_maps_url", savedLocationMap.get("google_maps_url"));
            }
        }
        return data;
    }

    protected List<String> listModuleSlugs(long userCompanyId) {
        return jdbcTemplate.query(
            "SELECT DISTINCT module_slug FROM user_company_module_roles WHERE user_company_id = ? ORDER BY module_slug ASC",
            (rs, rowNum) -> safe(rs.getString("module_slug")),
            userCompanyId
        );
    }

    protected List<Map<String, Object>> buildStructureMap(long companyId) {
        var businessesByUnit = new LinkedHashMap<Long, List<Map<String, Object>>>();
        jdbcTemplate.query(
            """
                SELECT id,
                       unit_id,
                       name,
                       latitude,
                       longitude,
                       radius_meters,
                       coordinate_source,
                       google_maps_url
                FROM businesses
                WHERE company_id = ?
                  AND (status = 'active' OR status IS NULL OR status = '')
                ORDER BY id ASC
                """,
            rs -> {
                var unitId = rs.getLong("unit_id");
                var business = new LinkedHashMap<String, Object>();
                business.put("name", safe(rs.getString("name")));
                business.put("legacy_business_id", rs.getLong("id"));
                putIfPresent(business, "latitude", rs.getBigDecimal("latitude"));
                putIfPresent(business, "longitude", rs.getBigDecimal("longitude"));
                putIfPresent(business, "radius_meters", getNullableInt(rs, "radius_meters"));
                putIfPresent(business, "coordinate_source", safe(rs.getString("coordinate_source")));
                putIfPresent(business, "google_maps_url", safe(rs.getString("google_maps_url")));
                businessesByUnit.computeIfAbsent(unitId, ignored -> new ArrayList<>()).add(business);
            },
            companyId
        );

        return jdbcTemplate.query(
            """
                SELECT id, name
                FROM units
                WHERE company_id = ?
                  AND (status = 'active' OR status IS NULL OR status = '')
                ORDER BY id ASC
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("name", safe(rs.getString("name")));
                row.put("legacy_unit_id", rs.getLong("id"));
                row.put("businesses", businessesByUnit.getOrDefault(rs.getLong("id"), Collections.emptyList()));
                return row;
            },
            companyId
        );
    }

    protected List<Map<String, Object>> normalizeStoredMap(JsonNode mapNode) {
        var normalizedMap = new ArrayList<Map<String, Object>>();
        if (!mapNode.isArray()) {
            return normalizedMap;
        }

        for (var unitNode : mapNode) {
            var name = firstNonBlank(
                readOptionalText(unitNode, "name"),
                readOptionalText(unitNode.path("unit_profile"), "display_name")
            );

            if (name.isBlank()) {
                continue;
            }

            var unit = new LinkedHashMap<String, Object>();
            unit.put("name", name);
            putIfPresent(unit, "legacy_unit_id", readOptionalLong(unitNode, "legacy_unit_id", "os_unit_id", "id"));
            putIfPresent(unit, "is_corporate_office", readOptionalBoolean(unitNode, "is_corporate_office", "isCorporateOffice", "corporate_office", "corporateOffice"));
            putIfPresent(unit, "logo", firstNonBlank(
                readOptionalText(unitNode, "logo"),
                readOptionalText(unitNode.path("unit_profile"), "photo")
            ));
            putIfPresent(unit, "industria", firstNonBlank(
                readOptionalText(unitNode, "industria"),
                readOptionalText(unitNode.path("unit_profile"), "industria")
            ));
            putIfPresent(unit, "direccion", firstNonBlank(
                readOptionalText(unitNode, "direccion"),
                readOptionalText(unitNode.path("unit_profile"), "address")
            ));
            putIfPresent(unit, "ciudad", readOptionalText(unitNode, "ciudad"));
            putIfPresent(unit, "estado", readOptionalText(unitNode, "estado"));
            putIfPresent(unit, "pais", readOptionalText(unitNode, "pais"));
            putIfPresent(unit, "cp", readOptionalText(unitNode, "cp"));
            putIfPresent(unit, "telefono", firstNonBlank(
                readOptionalText(unitNode, "telefono"),
                readOptionalText(unitNode.path("unit_profile"), "phone")
            ));
            putIfPresent(unit, "email", firstNonBlank(
                readOptionalText(unitNode, "email"),
                readOptionalText(unitNode.path("unit_profile"), "email")
            ));
            putCoordinateFields(unit, unitNode);

            var businesses = new ArrayList<Map<String, Object>>();
            if (unitNode.path("businesses").isArray()) {
                for (var businessNode : unitNode.path("businesses")) {
                    var businessName = firstNonBlank(
                        readOptionalText(businessNode, "name"),
                        readOptionalText(businessNode.path("biz_profile"), "display_name")
                    );
                    if (businessName.isBlank()) {
                        continue;
                    }

                    var business = new LinkedHashMap<String, Object>();
                    business.put("name", businessName);
                    putIfPresent(business, "legacy_business_id", readOptionalLong(businessNode, "legacy_business_id", "os_business_id", "id"));
                    putIfPresent(business, "logo", firstNonBlank(
                        readOptionalText(businessNode, "logo"),
                        readOptionalText(businessNode.path("biz_profile"), "photo")
                    ));
                    putIfPresent(business, "industria", firstNonBlank(
                        readOptionalText(businessNode, "industria"),
                        readOptionalText(businessNode.path("biz_profile"), "industria")
                    ));
                    putIfPresent(business, "direccion", firstNonBlank(
                        readOptionalText(businessNode, "direccion"),
                        readOptionalText(businessNode.path("biz_profile"), "address")
                    ));
                    putIfPresent(business, "ciudad", readOptionalText(businessNode, "ciudad"));
                    putIfPresent(business, "estado", readOptionalText(businessNode, "estado"));
                    putIfPresent(business, "pais", readOptionalText(businessNode, "pais"));
                    putIfPresent(business, "cp", readOptionalText(businessNode, "cp"));
                    putIfPresent(business, "telefono", firstNonBlank(
                        readOptionalText(businessNode, "telefono"),
                        readOptionalText(businessNode.path("biz_profile"), "phone")
                    ));
                    putIfPresent(business, "email", firstNonBlank(
                        readOptionalText(businessNode, "email"),
                        readOptionalText(businessNode.path("biz_profile"), "email")
                    ));
                    putIfPresent(business, "gerente", readOptionalText(businessNode, "gerente"));
                    putIfPresent(business, "horario", readOptionalText(businessNode, "horario"));
                    putCoordinateFields(business, businessNode);
                    businesses.add(business);
                }
            }

            unit.put("businesses", businesses);
            normalizedMap.add(unit);
        }

        return normalizeStoredCorporateOfficeMap(normalizedMap);
    }

    protected List<Map<String, Object>> normalizeStoredCorporateOfficeMap(List<Map<String, Object>> normalizedMap) {
        if (normalizedMap.isEmpty()) {
            return normalizedMap;
        }

        var selectedCorporateIndex = -1;
        for (var index = 0; index < normalizedMap.size(); index++) {
            if (Boolean.TRUE.equals(normalizedMap.get(index).get("is_corporate_office"))) {
                selectedCorporateIndex = index;
                break;
            }
        }
        if (selectedCorporateIndex < 0) {
            selectedCorporateIndex = 0;
        }

        for (var index = 0; index < normalizedMap.size(); index++) {
            normalizedMap.get(index).put("is_corporate_office", index == selectedCorporateIndex);
        }
        return normalizedMap;
    }

    protected ArrayNode buildStoredMapNode(List<UnitInput> desiredUnits, JsonNode existingMapNode) {
        var storedMap = objectMapper.createArrayNode();
        var existingUnitsById = new LinkedHashMap<Long, ObjectNode>();
        var existingUnitsByName = new LinkedHashMap<String, ObjectNode>();

        if (existingMapNode.isArray()) {
            for (var existingUnit : existingMapNode) {
                if (!(existingUnit instanceof ObjectNode existingUnitObject)) {
                    continue;
                }
                var existingUnitId = readOptionalLong(existingUnit, "legacy_unit_id", "os_unit_id", "id");
                if (existingUnitId != null) {
                    existingUnitsById.put(existingUnitId, existingUnitObject);
                }
                var existingName = firstNonBlank(
                    readOptionalText(existingUnit, "name"),
                    readOptionalText(existingUnit.path("unit_profile"), "display_name")
                );
                if (!existingName.isBlank()) {
                    existingUnitsByName.put(normalizeKey(existingName), existingUnitObject);
                }
            }
        }

        for (var desiredUnit : desiredUnits) {
            var baseUnit = findStoredUnitNode(desiredUnit, existingUnitsById, existingUnitsByName);
            var storedUnit = baseUnit == null ? objectMapper.createObjectNode() : baseUnit.deepCopy();

            var mergedLegacyUnitId = desiredUnit.legacyUnitId() != null
                ? desiredUnit.legacyUnitId()
                : readOptionalLong(storedUnit, "legacy_unit_id", "os_unit_id", "id");

            storedUnit.put("name", desiredUnit.name());
            storedUnit.put("is_corporate_office", desiredUnit.corporateOffice());
            putText(storedUnit, "logo", desiredUnit.logo());
            putText(storedUnit, "industria", desiredUnit.industria());
            putText(storedUnit, "direccion", desiredUnit.direccion());
            putText(storedUnit, "ciudad", desiredUnit.ciudad());
            putText(storedUnit, "estado", desiredUnit.estado());
            putText(storedUnit, "pais", desiredUnit.pais());
            putText(storedUnit, "cp", desiredUnit.cp());
            putText(storedUnit, "telefono", desiredUnit.telefono());
            putText(storedUnit, "email", desiredUnit.email());
            putCoordinateInput(storedUnit, desiredUnit.coordinates());
            if (mergedLegacyUnitId != null) {
                storedUnit.put("legacy_unit_id", mergedLegacyUnitId);
            }

            var storedBusinesses = objectMapper.createArrayNode();
            var existingBusinessesNode = baseUnit == null ? objectMapper.createArrayNode() : ensureArrayNode(baseUnit, "businesses");
            var existingBusinessesById = new LinkedHashMap<Long, ObjectNode>();
            var existingBusinessesByName = new LinkedHashMap<String, ObjectNode>();
            for (var existingBusiness : existingBusinessesNode) {
                if (!(existingBusiness instanceof ObjectNode existingBusinessObject)) {
                    continue;
                }
                var existingBusinessId = readOptionalLong(existingBusiness, "legacy_business_id", "os_business_id", "id");
                if (existingBusinessId != null) {
                    existingBusinessesById.put(existingBusinessId, existingBusinessObject);
                }
                var existingBusinessName = firstNonBlank(
                    readOptionalText(existingBusiness, "name"),
                    readOptionalText(existingBusiness.path("biz_profile"), "display_name")
                );
                if (!existingBusinessName.isBlank()) {
                    existingBusinessesByName.put(normalizeKey(existingBusinessName), existingBusinessObject);
                }
            }

            for (var desiredBusiness : desiredUnit.businesses()) {
                var baseBusiness = findStoredBusinessNode(desiredBusiness, existingBusinessesById, existingBusinessesByName);
                var storedBusiness = baseBusiness == null ? objectMapper.createObjectNode() : baseBusiness.deepCopy();

                var mergedLegacyBusinessId = desiredBusiness.legacyBusinessId() != null
                    ? desiredBusiness.legacyBusinessId()
                    : readOptionalLong(storedBusiness, "legacy_business_id", "os_business_id", "id");

                storedBusiness.put("name", desiredBusiness.name());
                putText(storedBusiness, "logo", desiredBusiness.logo());
                putText(storedBusiness, "industria", desiredBusiness.industria());
                putText(storedBusiness, "direccion", desiredBusiness.direccion());
                putText(storedBusiness, "ciudad", desiredBusiness.ciudad());
                putText(storedBusiness, "estado", desiredBusiness.estado());
                putText(storedBusiness, "pais", desiredBusiness.pais());
                putText(storedBusiness, "cp", desiredBusiness.cp());
                putText(storedBusiness, "telefono", desiredBusiness.telefono());
                putText(storedBusiness, "email", desiredBusiness.email());
                putText(storedBusiness, "gerente", desiredBusiness.gerente());
                putText(storedBusiness, "horario", desiredBusiness.horario());
                putCoordinateInput(storedBusiness, desiredBusiness.coordinates());
                if (mergedLegacyBusinessId != null) {
                    storedBusiness.put("legacy_business_id", mergedLegacyBusinessId);
                }

                storedBusinesses.add(storedBusiness);
            }

            storedUnit.set("businesses", storedBusinesses);
            storedMap.add(storedUnit);
        }

        return storedMap;
    }

    protected ObjectNode findStoredUnitNode(
        UnitInput desiredUnit,
        Map<Long, ObjectNode> existingUnitsById,
        Map<String, ObjectNode> existingUnitsByName
    ) {
        if (desiredUnit.legacyUnitId() != null && existingUnitsById.containsKey(desiredUnit.legacyUnitId())) {
            return existingUnitsById.get(desiredUnit.legacyUnitId());
        }

        return existingUnitsByName.get(normalizeKey(desiredUnit.name()));
    }

    protected ObjectNode findStoredBusinessNode(
        BusinessInput desiredBusiness,
        Map<Long, ObjectNode> existingBusinessesById,
        Map<String, ObjectNode> existingBusinessesByName
    ) {
        if (desiredBusiness.legacyBusinessId() != null && existingBusinessesById.containsKey(desiredBusiness.legacyBusinessId())) {
            return existingBusinessesById.get(desiredBusiness.legacyBusinessId());
        }

        return existingBusinessesByName.get(normalizeKey(desiredBusiness.name()));
    }

    protected Map<String, Object> normalizeEmpresaTemplate(JsonNode templateNode) {
        var template = new LinkedHashMap<String, Object>();
        putIfPresent(template, "logo", readOptionalText(templateNode, "logo", "logo_url"));
        putIfPresent(template, "industria", readOptionalText(templateNode, "industria"));
        putIfPresent(template, "modelo_negocio", readOptionalText(templateNode, "modelo_negocio"));
        putIfPresent(template, "descripcion", readOptionalText(templateNode, "descripcion"));
        putIfPresent(template, "currency", firstNonBlank(
            readOptionalText(templateNode, "currency"),
            readOptionalText(templateNode, "moneda")
        ));
        putIfPresent(template, "timezone", firstNonBlank(
            readOptionalText(templateNode, "timezone"),
            readOptionalText(templateNode, "zona_horaria")
        ));
        putIfPresent(template, "tamano_empresa", readOptionalText(templateNode, "tamano_empresa"));
        putIfPresent(template, "display_name", readOptionalText(templateNode, "display_name"));
        var headquartersLocation = normalizeHeadquartersLocation(templateNode);
        if (headquartersLocation.isEmpty()) {
            putCoordinateFields(template, templateNode);
        } else {
            putIfPresent(template, HEADQUARTERS_LOCATION_KEY, headquartersLocation);
            putIfPresent(template, ADDRESS_KEY, headquartersLocation.get(ADDRESS_KEY));
            putIfPresent(template, "latitude", headquartersLocation.get("latitude"));
            putIfPresent(template, "longitude", headquartersLocation.get("longitude"));
            putIfPresent(template, "radius_meters", headquartersLocation.get("radius_meters"));
            putIfPresent(template, "coordinate_source", headquartersLocation.get("coordinate_source"));
            putIfPresent(template, "google_maps_url", headquartersLocation.get("google_maps_url"));
        }
        return template;
    }

    protected Map<String, Object> normalizeHeadquartersLocation(JsonNode templateNode) {
        var location = new LinkedHashMap<String, Object>();
        if (templateNode == null || templateNode.isMissingNode() || templateNode.isNull()) {
            return location;
        }

        var locationNode = templateNode.path(HEADQUARTERS_LOCATION_KEY);

        putCoordinateFields(location, templateNode);
        if (locationNode.isObject()) {
            putCoordinateFields(location, locationNode);
        }

        var address = normalizeHeadquartersAddress(templateNode, locationNode);
        if (!address.isEmpty()) {
            location.put(ADDRESS_KEY, address);
        }

        return location;
    }

    protected Map<String, Object> normalizeHeadquartersAddress(JsonNode templateNode, JsonNode locationNode) {
        var address = new LinkedHashMap<String, Object>();
        addHeadquartersAddressFields(address, templateNode);

        var rootAddressNode = templateNode == null ? null : templateNode.path(ADDRESS_KEY);
        if (rootAddressNode != null && rootAddressNode.isObject()) {
            addHeadquartersAddressFields(address, rootAddressNode);
        } else if (rootAddressNode != null && rootAddressNode.isTextual()) {
            putIfPresent(address, "street", rootAddressNode.asText("").trim());
        }

        if (locationNode != null && locationNode.isObject()) {
            addHeadquartersAddressFields(address, locationNode);
            var locationAddressNode = locationNode.path(ADDRESS_KEY);
            if (locationAddressNode.isObject()) {
                addHeadquartersAddressFields(address, locationAddressNode);
            } else if (locationAddressNode.isTextual()) {
                putIfPresent(address, "street", locationAddressNode.asText("").trim());
            }
        }

        return address;
    }

    protected void addHeadquartersAddressFields(Map<String, Object> address, JsonNode sourceNode) {
        if (sourceNode == null || sourceNode.isMissingNode() || sourceNode.isNull()) {
            return;
        }

        putIfPresent(address, "street", readOptionalText(sourceNode, "street", "address_line", "addressLine", "direccion"));
        putIfPresent(address, "country", readOptionalText(sourceNode, "country", "pais"));
        putIfPresent(address, "state", readOptionalText(sourceNode, "state", "province", "state_province", "stateProvince", "estado"));
        putIfPresent(address, "city", readOptionalText(sourceNode, "city", "ciudad"));
        putIfPresent(address, "zip", readOptionalText(sourceNode, "zip", "postal_code", "postalCode", "cp"));
    }

    protected ObjectNode loadSettingsRoot(long companyId) {
        var rows = jdbcTemplate.query(
            "SELECT settings_json FROM company_settings WHERE company_id = ? LIMIT 1",
            (rs, rowNum) -> rs.getString("settings_json"),
            companyId
        );

        if (rows.isEmpty() || rows.get(0) == null || rows.get(0).isBlank()) {
            return objectMapper.createObjectNode();
        }

        try {
            var node = objectMapper.readTree(rows.get(0));
            if (node instanceof ObjectNode objectNode) {
                return objectNode.deepCopy();
            }
        } catch (JsonProcessingException ignored) {
            // fall through to empty object
        }

        return objectMapper.createObjectNode();
    }

    protected ObjectNode ensureConfigCenterNode(ObjectNode settingsRoot) {
        return ensureObjectNode(settingsRoot, CONFIG_CENTER_KEY);
    }

    protected ObjectNode ensureObjectNode(ObjectNode parentNode, String fieldName) {
        var childNode = parentNode.get(fieldName);
        if (childNode instanceof ObjectNode objectNode) {
            return objectNode;
        }

        var objectNode = objectMapper.createObjectNode();
        parentNode.set(fieldName, objectNode);
        return objectNode;
    }

    protected ArrayNode ensureArrayNode(JsonNode parentNode, String fieldName) {
        if (parentNode instanceof ObjectNode objectNode) {
            var childNode = objectNode.get(fieldName);
            if (childNode instanceof ArrayNode arrayNode) {
                return arrayNode;
            }
        }
        return objectMapper.createArrayNode();
    }

    protected void upsertSettingsRoot(long companyId, ObjectNode settingsRoot) {
        try {
            jdbcTemplate.update(
                """
                    INSERT INTO company_settings (company_id, settings_json)
                    VALUES (?, ?)
                    ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json)
                    """,
                companyId,
                objectMapper.writeValueAsString(settingsRoot)
            );
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to serialize company settings.", ex);
        }
    }
}
