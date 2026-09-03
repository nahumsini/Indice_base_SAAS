package com.indice.erp.configcenter.structure;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.configcenter.company.ConfigCenterCompanyUseCases;
import com.indice.erp.configcenter.support.BusinessInput;
import com.indice.erp.configcenter.support.CoordinateInput;
import com.indice.erp.configcenter.support.ExistingBusiness;
import com.indice.erp.configcenter.support.ExistingUnit;
import com.indice.erp.configcenter.support.UnitInput;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

public abstract class ConfigCenterBusinessStructureUseCases extends ConfigCenterCompanyUseCases {
    private static final String UNIT_HEADQUARTERS_SUFFIX = " headquarters";

    protected ConfigCenterBusinessStructureUseCases(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        BCryptPasswordEncoder passwordEncoder,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties,
        CompanyStorageMeter storageMeter
    ) {
        super(jdbcTemplate, objectMapper, passwordEncoder, objectStorageService, objectStorageProperties, storageMeter);
    }

    public Map<String, Object> saveStructure(long companyId, long userId, Map<String, Object> payload) {
        var estructura = value(payload, "modo", "estructura");
        if (!"multi".equals(estructura)) {
            estructura = "simple";
        }

        var map = normalizeCorporateOfficeStructure(companyId, normalizeMap(payload));

        persistStructure(companyId, userId, map);

        var settingsRoot = loadSettingsRoot(companyId);
        var configCenterNode = ensureConfigCenterNode(settingsRoot);
        configCenterNode.put("estructura", estructura);
        configCenterNode.put("colaboradores", resolveCollaborators(companyId, readOptionalInt(configCenterNode, "colaboradores")));
        configCenterNode.set("map", buildStoredMapNode(map, configCenterNode.path("map")));
        upsertSettingsRoot(companyId, settingsRoot);

        var response = new LinkedHashMap<String, Object>();
        response.put("modo", estructura);
        response.put("colaboradores", resolveCollaborators(companyId, readOptionalInt(configCenterNode, "colaboradores")));
        response.put("unidades_aprox", map.size());
        response.put("map", normalizeStoredMap(configCenterNode.path("map")));
        return response;
    }

    protected List<UnitInput> normalizeCorporateOfficeStructure(long companyId, List<UnitInput> desiredUnits) {
        if (desiredUnits.isEmpty()) {
            return desiredUnits;
        }

        var normalizedUnits = new ArrayList<>(desiredUnits);
        var selectedCorporateIndex = -1;
        for (var index = 0; index < desiredUnits.size(); index++) {
            if (desiredUnits.get(index).corporateOffice()) {
                selectedCorporateIndex = index;
                break;
            }
        }
        if (selectedCorporateIndex < 0) {
            selectedCorporateIndex = 0;
        }

        for (var index = 0; index < desiredUnits.size(); index++) {
            var unit = desiredUnits.get(index);
            var isCorporateOffice = index == selectedCorporateIndex;
            var normalizedBusinesses = new ArrayList<>(unit.businesses());
            var normalizedUnit = unitWithNormalizedName(unit, isCorporateOffice);
            var normalizedUnitIsCorporateOffice = isHeadquartersName(normalizedUnit.name());

            if (normalizedUnitIsCorporateOffice) {
                var companyName = loadCompanyName(companyId);
                var corporateBusinessIndex = findCorporateOfficeBusinessIndex(normalizedBusinesses, companyName);
                var existingCorporateBusiness = corporateBusinessIndex >= 0
                    ? normalizedBusinesses.remove(corporateBusinessIndex)
                    : null;

                normalizedBusinesses.add(
                    0,
                    normalizeHeadquartersBusiness(
                        normalizedUnit,
                        existingCorporateBusiness,
                        CORPORATE_OFFICE_BUSINESS_FALLBACK_NAME
                    )
                );
            }

            if (!normalizedUnitIsCorporateOffice) {
                var unitHeadquartersBusinessName = unitHeadquartersBusinessName(normalizedUnit.name());
                var unitHeadquartersBusinessIndex = findUnitHeadquartersBusinessIndex(
                    normalizedBusinesses,
                    normalizedUnit.name(),
                    unitHeadquartersBusinessName
                );
                var existingUnitHeadquartersBusiness = unitHeadquartersBusinessIndex >= 0
                    ? normalizedBusinesses.remove(unitHeadquartersBusinessIndex)
                    : null;

                normalizedBusinesses.add(
                    0,
                    normalizeHeadquartersBusiness(
                        normalizedUnit,
                        existingUnitHeadquartersBusiness,
                        unitHeadquartersBusinessName
                    )
                );
            }

            normalizedUnits.set(index, new UnitInput(
                normalizedUnit.name(),
                normalizedUnit.legacyUnitId(),
                normalizedUnit.corporateOffice(),
                normalizedUnit.logo(),
                normalizedUnit.industria(),
                normalizedUnit.direccion(),
                normalizedUnit.ciudad(),
                normalizedUnit.estado(),
                normalizedUnit.pais(),
                normalizedUnit.cp(),
                normalizedUnit.telefono(),
                normalizedUnit.email(),
                normalizedUnit.coordinates(),
                normalizedBusinesses
            ));
        }
        return normalizedUnits;
    }

    protected BusinessInput normalizeHeadquartersBusiness(
        UnitInput unit,
        BusinessInput existingBusiness,
        String headquartersBusinessName
    ) {
        return new BusinessInput(
            headquartersBusinessName,
            existingBusiness == null ? null : existingBusiness.legacyBusinessId(),
            existingBusiness == null ? unit.logo() : firstNonBlank(existingBusiness.logo(), unit.logo()),
            existingBusiness == null ? unit.industria() : firstNonBlank(existingBusiness.industria(), unit.industria()),
            existingBusiness == null ? unit.direccion() : firstNonBlank(existingBusiness.direccion(), unit.direccion()),
            existingBusiness == null ? unit.ciudad() : firstNonBlank(existingBusiness.ciudad(), unit.ciudad()),
            existingBusiness == null ? unit.estado() : firstNonBlank(existingBusiness.estado(), unit.estado()),
            existingBusiness == null ? unit.pais() : firstNonBlank(existingBusiness.pais(), unit.pais()),
            existingBusiness == null ? unit.cp() : firstNonBlank(existingBusiness.cp(), unit.cp()),
            existingBusiness == null ? unit.telefono() : firstNonBlank(existingBusiness.telefono(), unit.telefono()),
            existingBusiness == null ? unit.email() : firstNonBlank(existingBusiness.email(), unit.email()),
            existingBusiness == null ? "" : existingBusiness.gerente(),
            existingBusiness == null ? "" : existingBusiness.horario(),
            existingBusiness == null || existingBusiness.coordinates() == null
                ? unit.coordinates()
                : existingBusiness.coordinates()
        );
    }

    protected String normalizeCorporateOfficeUnitName(String unitName, boolean isCorporateOffice) {
        if (isCorporateOffice && isHeadquartersName(unitName)) {
            return CORPORATE_OFFICE_UNIT_NAME;
        }
        return unitName;
    }

    private UnitInput unitWithNormalizedName(UnitInput unit, boolean isCorporateOffice) {
        return new UnitInput(
            normalizeCorporateOfficeUnitName(unit.name(), isCorporateOffice),
            unit.legacyUnitId(),
            isCorporateOffice,
            unit.logo(),
            unit.industria(),
            unit.direccion(),
            unit.ciudad(),
            unit.estado(),
            unit.pais(),
            unit.cp(),
            unit.telefono(),
            unit.email(),
            unit.coordinates(),
            unit.businesses()
        );
    }

    private String unitHeadquartersBusinessName(String unitName) {
        return firstNonBlank(unitName, "Unit") + UNIT_HEADQUARTERS_SUFFIX;
    }

    private int findCorporateOfficeBusinessIndex(List<BusinessInput> businesses, String companyName) {
        for (var index = 0; index < businesses.size(); index++) {
            var businessName = businesses.get(index).name();
            if (isHeadquartersName(businessName) || (index == 0 && namesMatch(businessName, companyName))) {
                return index;
            }
        }
        return -1;
    }

    private int findUnitHeadquartersBusinessIndex(
        List<BusinessInput> businesses,
        String unitName,
        String unitHeadquartersBusinessName
    ) {
        for (var index = 0; index < businesses.size(); index++) {
            var businessName = businesses.get(index).name();
            if (
                namesMatch(businessName, unitHeadquartersBusinessName)
                || namesMatch(businessName, firstNonBlank(unitName, "Unit") + " headquarter")
                || (index == 0 && isLegacyHeadquartersName(businessName))
            ) {
                return index;
            }
        }
        return -1;
    }

    private boolean isLegacyHeadquartersName(String value) {
        var normalized = normalizeKey(value);
        return normalized.equals(normalizeKey(HEADQUARTERS_UNIT_NAME))
            || normalized.equals(normalizeKey(LEGACY_HEADQUARTERS_UNIT_NAME));
    }

    private boolean namesMatch(String first, String second) {
        return !firstNonBlank(first).isBlank()
            && !firstNonBlank(second).isBlank()
            && normalizeKey(first).equals(normalizeKey(second));
    }

    protected void persistStructure(long companyId, long userId, List<UnitInput> desiredUnits) {
        var existingUnits = loadExistingUnits(companyId);
        var existingBusinesses = loadExistingBusinesses(companyId);

        var existingUnitsById = new LinkedHashMap<Long, ExistingUnit>();
        var existingUnitsByName = new LinkedHashMap<String, ExistingUnit>();
        for (var unit : existingUnits) {
            existingUnitsById.put(unit.id(), unit);
            existingUnitsByName.put(normalizeKey(unit.name()), unit);
        }

        var existingBusinessesById = new LinkedHashMap<Long, ExistingBusiness>();
        var existingBusinessesByKey = new LinkedHashMap<String, ExistingBusiness>();
        for (var business : existingBusinesses) {
            existingBusinessesById.put(business.id(), business);
            existingBusinessesByKey.put(
                normalizeKey(business.name()) + "::" + String.valueOf(business.unitId()),
                business
            );
        }

        var keptUnitIds = new LinkedHashSet<Long>();
        var keptBusinessIds = new LinkedHashSet<Long>();

        for (var desiredUnit : desiredUnits) {
            var unitId = matchUnitId(desiredUnit, existingUnitsById, existingUnitsByName);
            if (unitId == null) {
                jdbcTemplate.update(
                    "INSERT INTO units (company_id, name, status) VALUES (?, ?, 'active')",
                    companyId,
                    desiredUnit.name()
                );
                unitId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
            } else {
                jdbcTemplate.update(
                    "UPDATE units SET name = ?, status = 'active' WHERE id = ? AND company_id = ?",
                    desiredUnit.name(),
                    unitId,
                    companyId
                );
            }

            keptUnitIds.add(unitId);

            var businessIndex = 0;
            for (var desiredBusiness : desiredUnit.businesses()) {
                var businessId = matchBusinessId(desiredBusiness, unitId, existingBusinessesById, existingBusinessesByKey);
                var coordinates = desiredBusiness.coordinates();
                if (businessId == null) {
                    jdbcTemplate.update(
                        """
                            INSERT INTO businesses
                            (company_id, unit_id, name, address, latitude, longitude, radius_meters, coordinate_source, google_maps_url, status)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
                            """,
                        companyId,
                        unitId,
                        desiredBusiness.name(),
                        nullableText(desiredBusiness.direccion()),
                        coordinateLatitude(coordinates),
                        coordinateLongitude(coordinates),
                        coordinateRadius(coordinates),
                        coordinateSource(coordinates),
                        nullableText(coordinates == null ? "" : coordinates.googleMapsUrl())
                    );
                    businessId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
                } else {
                    jdbcTemplate.update(
                        """
                            UPDATE businesses
                            SET name = ?,
                                unit_id = ?,
                                address = ?,
                                latitude = ?,
                                longitude = ?,
                                radius_meters = ?,
                                coordinate_source = ?,
                                google_maps_url = ?,
                                status = 'active'
                            WHERE id = ? AND company_id = ?
                            """,
                        desiredBusiness.name(),
                        unitId,
                        nullableText(desiredBusiness.direccion()),
                        coordinateLatitude(coordinates),
                        coordinateLongitude(coordinates),
                        coordinateRadius(coordinates),
                        coordinateSource(coordinates),
                        nullableText(coordinates == null ? "" : coordinates.googleMapsUrl()),
                        businessId,
                        companyId
                    );
                }

                keptBusinessIds.add(businessId);
                var attendanceLocationName = namesMatch(desiredBusiness.name(), CORPORATE_OFFICE_BUSINESS_FALLBACK_NAME)
                    ? CORPORATE_OFFICE_UNIT_NAME
                    : desiredBusiness.name();
                syncBusinessStructureAttendanceLocation(
                    companyId,
                    userId,
                    unitId,
                    businessId,
                    desiredBusiness,
                    attendanceLocationName
                );
                businessIndex++;
            }
        }

        for (var business : existingBusinesses) {
            if (!keptBusinessIds.contains(business.id())) {
                if (namesMatch(business.name(), CORPORATE_OFFICE_BUSINESS_FALLBACK_NAME)) {
                    continue;
                }
                deactivateBusinessStructureAttendanceLocation(companyId, business.id());
                jdbcTemplate.update(
                    "UPDATE businesses SET status = 'inactive' WHERE id = ? AND company_id = ?",
                    business.id(),
                    companyId
                );
            }
        }

        for (var unit : existingUnits) {
            if (!keptUnitIds.contains(unit.id())) {
                if (isHeadquartersName(unit.name())) {
                    continue;
                }
                jdbcTemplate.update(
                    "UPDATE units SET status = 'inactive' WHERE id = ? AND company_id = ?",
                    unit.id(),
                    companyId
                );
            }
        }
    }

    protected List<ExistingUnit> loadExistingUnits(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT id, name
                FROM units
                WHERE company_id = ?
                ORDER BY id ASC
                """,
            (rs, rowNum) -> new ExistingUnit(
                rs.getLong("id"),
                safe(rs.getString("name"))
            ),
            companyId
        );
    }

    protected List<ExistingBusiness> loadExistingBusinesses(long companyId) {
        return jdbcTemplate.query(
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
                ORDER BY id ASC
                """,
            (rs, rowNum) -> new ExistingBusiness(
                rs.getLong("id"),
                getNullableLong(rs, "unit_id"),
                safe(rs.getString("name")),
                rs.getBigDecimal("latitude"),
                rs.getBigDecimal("longitude"),
                getNullableInt(rs, "radius_meters"),
                safe(rs.getString("coordinate_source")),
                safe(rs.getString("google_maps_url"))
            ),
            companyId
        );
    }

    protected Long matchUnitId(
        UnitInput desiredUnit,
        Map<Long, ExistingUnit> existingUnitsById,
        Map<String, ExistingUnit> existingUnitsByName
    ) {
        if (desiredUnit.legacyUnitId() != null && existingUnitsById.containsKey(desiredUnit.legacyUnitId())) {
            return desiredUnit.legacyUnitId();
        }

        var existingUnit = existingUnitsByName.get(normalizeKey(desiredUnit.name()));
        return existingUnit == null ? null : existingUnit.id();
    }

    protected Long matchBusinessId(
        BusinessInput desiredBusiness,
        long unitId,
        Map<Long, ExistingBusiness> existingBusinessesById,
        Map<String, ExistingBusiness> existingBusinessesByKey
    ) {
        if (desiredBusiness.legacyBusinessId() != null && existingBusinessesById.containsKey(desiredBusiness.legacyBusinessId())) {
            return desiredBusiness.legacyBusinessId();
        }

        var existingBusiness = existingBusinessesByKey.get(normalizeKey(desiredBusiness.name()) + "::" + unitId);
        return existingBusiness == null ? null : existingBusiness.id();
    }

    protected void syncBusinessStructureAttendanceLocation(
        long companyId,
        long userId,
        long unitId,
        long businessId,
        BusinessInput business,
        String locationName
    ) {
        var coordinates = business.coordinates();
        if (coordinates == null || !coordinates.hasCoordinates()) {
            deactivateBusinessStructureAttendanceLocation(companyId, businessId);
            return;
        }

        var existingLocationId = findBusinessStructureAttendanceLocationId(companyId, businessId);
        if (existingLocationId == null) {
            jdbcTemplate.update(
                """
                    INSERT INTO attendance_locations
                    (company_id, unit_id, business_id, contract_start_date, contract_end_date, name, latitude, longitude, radius_meters,
                     required_hours_per_day, required_start_time, required_end_time, required_days_per_week, status, managed_source, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'business_structure', ?)
                    """,
                companyId,
                unitId,
                businessId,
                LocalDate.of(1970, 1, 1),
                LocalDate.of(9999, 12, 31),
                firstNonBlank(locationName, business.name()),
                coordinates.latitude(),
                coordinates.longitude(),
                coordinates.radiusMeters(),
                new BigDecimal("8.00"),
                LocalTime.of(8, 0),
                LocalTime.of(16, 0),
                5,
                userId
            );
            return;
        }

        jdbcTemplate.update(
            """
                UPDATE attendance_locations
                SET unit_id = ?,
                    business_id = ?,
                    contract_start_date = ?,
                    contract_end_date = ?,
                    name = ?,
                    latitude = ?,
                    longitude = ?,
                    radius_meters = ?,
                    required_hours_per_day = ?,
                    required_start_time = ?,
                    required_end_time = ?,
                    required_days_per_week = ?,
                    status = 'active',
                    managed_source = 'business_structure'
                WHERE id = ? AND company_id = ?
                """,
            unitId,
            businessId,
            LocalDate.of(1970, 1, 1),
            LocalDate.of(9999, 12, 31),
            firstNonBlank(locationName, business.name()),
            coordinates.latitude(),
            coordinates.longitude(),
            coordinates.radiusMeters(),
            new BigDecimal("8.00"),
            LocalTime.of(8, 0),
            LocalTime.of(16, 0),
            5,
            existingLocationId,
            companyId
        );
    }

    protected void syncCompanyStructureAttendanceLocation(
        long companyId,
        long userId,
        String companyName,
        CoordinateInput coordinates
    ) {
        if (coordinates == null || !coordinates.hasCoordinates()) {
            deactivateCompanyStructureAttendanceLocation(companyId);
            return;
        }

        var locationName = firstNonBlank(companyName, "Company location");
        var existingLocationId = findCompanyStructureAttendanceLocationId(companyId);
        if (existingLocationId == null) {
            jdbcTemplate.update(
                """
                    INSERT INTO attendance_locations
                    (company_id, unit_id, business_id, contract_start_date, contract_end_date, name, latitude, longitude, radius_meters,
                     required_hours_per_day, required_start_time, required_end_time, required_days_per_week, status, managed_source, created_by)
                    VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'business_structure', ?)
                    """,
                companyId,
                LocalDate.of(1970, 1, 1),
                LocalDate.of(9999, 12, 31),
                locationName,
                coordinates.latitude(),
                coordinates.longitude(),
                coordinates.radiusMeters(),
                new BigDecimal("8.00"),
                LocalTime.of(8, 0),
                LocalTime.of(16, 0),
                5,
                userId
            );
            return;
        }

        jdbcTemplate.update(
            """
                UPDATE attendance_locations
                SET unit_id = NULL,
                    business_id = NULL,
                    contract_start_date = ?,
                    contract_end_date = ?,
                    name = ?,
                    latitude = ?,
                    longitude = ?,
                    radius_meters = ?,
                    required_hours_per_day = ?,
                    required_start_time = ?,
                    required_end_time = ?,
                    required_days_per_week = ?,
                    status = 'active',
                    managed_source = 'business_structure'
                WHERE id = ? AND company_id = ?
                """,
            LocalDate.of(1970, 1, 1),
            LocalDate.of(9999, 12, 31),
            locationName,
            coordinates.latitude(),
            coordinates.longitude(),
            coordinates.radiusMeters(),
            new BigDecimal("8.00"),
            LocalTime.of(8, 0),
            LocalTime.of(16, 0),
            5,
            existingLocationId,
            companyId
        );
    }

    protected Long findBusinessStructureAttendanceLocationId(long companyId, long businessId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id
                FROM attendance_locations
                WHERE company_id = ?
                  AND business_id = ?
                  AND managed_source = 'business_structure'
                ORDER BY id ASC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            companyId,
            businessId
        );
        return rows.isEmpty() ? null : rows.get(0);
    }

    protected Long findCompanyStructureAttendanceLocationId(long companyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id
                FROM attendance_locations
                WHERE company_id = ?
                  AND business_id IS NULL
                  AND unit_id IS NULL
                  AND managed_source = 'business_structure'
                ORDER BY id ASC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            companyId
        );
        return rows.isEmpty() ? null : rows.get(0);
    }

    protected void deactivateBusinessStructureAttendanceLocation(long companyId, long businessId) {
        jdbcTemplate.update(
            """
                UPDATE attendance_locations
                SET status = 'inactive'
                WHERE company_id = ?
                  AND business_id = ?
                  AND managed_source = 'business_structure'
                """,
            companyId,
            businessId
        );
    }

    protected void deactivateCompanyStructureAttendanceLocation(long companyId) {
        jdbcTemplate.update(
            """
                UPDATE attendance_locations
                SET status = 'inactive'
                WHERE company_id = ?
                  AND business_id IS NULL
                  AND unit_id IS NULL
                  AND managed_source = 'business_structure'
                """,
            companyId
        );
    }

    protected BigDecimal coordinateLatitude(CoordinateInput coordinates) {
        return coordinates == null || !coordinates.hasCoordinates() ? null : coordinates.latitude();
    }

    protected BigDecimal coordinateLongitude(CoordinateInput coordinates) {
        return coordinates == null || !coordinates.hasCoordinates() ? null : coordinates.longitude();
    }

    protected Integer coordinateRadius(CoordinateInput coordinates) {
        return coordinates == null || !coordinates.hasCoordinates() ? null : coordinates.radiusMeters();
    }

    protected String coordinateSource(CoordinateInput coordinates) {
        return coordinates == null || !coordinates.hasCoordinates() ? null : firstNonBlank(coordinates.coordinateSource(), "manual");
    }

    protected List<UnitInput> normalizeMap(Map<String, Object> payload) {
        var result = new ArrayList<UnitInput>();

        var rawMap = payload.get("map");
        if (rawMap instanceof List<?> mapList) {
            for (var unitCandidate : mapList) {
                if (!(unitCandidate instanceof Map<?, ?> unitMap)) {
                    continue;
                }

                var unit = normalizeUnitMap(unitMap);
                if (unit != null) {
                    result.add(unit);
                }
            }
        }

        if (!result.isEmpty()) {
            return result;
        }

        var rawUnits = payload.get("unidades");
        if (rawUnits instanceof List<?> unitsList) {
            for (var unitCandidate : unitsList) {
                if (!(unitCandidate instanceof Map<?, ?> unitMap)) {
                    continue;
                }

                var normalizedUnitMap = new LinkedHashMap<String, Object>();
                normalizedUnitMap.put("name", unitMap.get("nombre"));
                normalizedUnitMap.put("legacy_unit_id", unitMap.get("legacy_unit_id"));
                normalizedUnitMap.put("is_corporate_office", firstNonNull(
                    unitMap.get("is_corporate_office"),
                    unitMap.get("isCorporateOffice"),
                    unitMap.get("corporate_office"),
                    unitMap.get("corporateOffice")
                ));
                normalizedUnitMap.put("logo", unitMap.get("logo"));
                normalizedUnitMap.put("industria", unitMap.get("industria"));
                normalizedUnitMap.put("direccion", unitMap.get("direccion"));
                normalizedUnitMap.put("ciudad", unitMap.get("ciudad"));
                normalizedUnitMap.put("estado", unitMap.get("estado"));
                normalizedUnitMap.put("pais", unitMap.get("pais"));
                normalizedUnitMap.put("cp", unitMap.get("cp"));
                normalizedUnitMap.put("telefono", unitMap.get("telefono"));
                normalizedUnitMap.put("email", unitMap.get("email"));
                normalizedUnitMap.put("latitude", firstNonNull(unitMap.get("latitude"), unitMap.get("latitud")));
                normalizedUnitMap.put("longitude", firstNonNull(unitMap.get("longitude"), unitMap.get("longitud"), unitMap.get("lng")));
                normalizedUnitMap.put("radius_meters", firstNonNull(unitMap.get("radius_meters"), unitMap.get("radiusMeters"), unitMap.get("radio")));
                normalizedUnitMap.put("coordinate_source", firstNonNull(unitMap.get("coordinate_source"), unitMap.get("coordinateSource"), unitMap.get("source")));
                normalizedUnitMap.put("google_maps_url", firstNonNull(unitMap.get("google_maps_url"), unitMap.get("googleMapsUrl"), unitMap.get("map_url"), unitMap.get("mapUrl")));
                normalizedUnitMap.put("businesses", unitMap.get("negocios"));

                var unit = normalizeUnitMap(normalizedUnitMap);
                if (unit != null) {
                    result.add(unit);
                }
            }
        }

        return result;
    }

    protected UnitInput normalizeUnitMap(Map<?, ?> unitMap) {
        var name = firstNonBlank(
            safe(objectString(unitMap.get("name"))),
            safe(objectString(unitMap.get("nombre")))
        );
        if (name.isBlank()) {
            return null;
        }

        var businesses = new ArrayList<BusinessInput>();
        var rawBusinesses = unitMap.get("businesses");
        if (!(rawBusinesses instanceof List<?>)) {
            rawBusinesses = unitMap.get("negocios");
        }

        if (rawBusinesses instanceof List<?> businessList) {
            for (var businessCandidate : businessList) {
                var business = normalizeBusinessInput(businessCandidate);
                if (business != null) {
                    businesses.add(business);
                }
            }
        }

        return new UnitInput(
            name,
            readOptionalLong(unitMap, "legacy_unit_id", "os_unit_id", "id"),
            readOptionalBoolean(unitMap, false, "is_corporate_office", "isCorporateOffice", "corporate_office", "corporateOffice"),
            objectString(unitMap.get("logo")),
            objectString(unitMap.get("industria")),
            objectString(unitMap.get("direccion")),
            objectString(unitMap.get("ciudad")),
            objectString(unitMap.get("estado")),
            objectString(unitMap.get("pais")),
            objectString(unitMap.get("cp")),
            objectString(unitMap.get("telefono")),
            objectString(unitMap.get("email")),
            normalizeCoordinateInput(unitMap),
            businesses
        );
    }

    protected BusinessInput normalizeBusinessInput(Object businessCandidate) {
        if (businessCandidate instanceof Map<?, ?> businessMap) {
            var name = firstNonBlank(
                safe(objectString(businessMap.get("name"))),
                safe(objectString(businessMap.get("nombre")))
            );
            if (name.isBlank()) {
                return null;
            }

            return new BusinessInput(
                name,
                readOptionalLong(businessMap, "legacy_business_id", "os_business_id", "id"),
                objectString(businessMap.get("logo")),
                objectString(businessMap.get("industria")),
                objectString(businessMap.get("direccion")),
                objectString(businessMap.get("ciudad")),
                objectString(businessMap.get("estado")),
                objectString(businessMap.get("pais")),
                objectString(businessMap.get("cp")),
                objectString(businessMap.get("telefono")),
                objectString(businessMap.get("email")),
                objectString(businessMap.get("gerente")),
                objectString(businessMap.get("horario")),
                normalizeCoordinateInput(businessMap)
            );
        }

        var businessName = safe(objectString(businessCandidate));
        if (businessName.isBlank()) {
            return null;
        }

        return new BusinessInput(
            businessName,
            null,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            new CoordinateInput(null, null, null, "", "")
        );
    }
}
