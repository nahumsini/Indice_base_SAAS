package com.indice.erp.dashboard;

import com.indice.erp.auth.AuthSessionUser;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class OrganizationService {

    private static final String CORPORATE_OFFICE_UNIT_NAME = "Corporate office";
    private static final String UNIT_HEADQUARTERS_SUFFIX = " headquarters";
    private static final Set<String> CORPORATE_OFFICE_KEYS = Set.of(
        "corporateoffice",
        "oficinacorporativa",
        "sedecorporativa",
        "headquarter",
        "headquarters"
    );

    private final JdbcTemplate jdbcTemplate;
    private final DashboardModuleAccessRepository moduleAccessRepository;
    private final DashboardModuleCatalogRepository moduleCatalogRepository;
    private final OrganizationScopeAccess organizationScopeAccess;

    public OrganizationService(
        JdbcTemplate jdbcTemplate,
        DashboardModuleAccessRepository moduleAccessRepository,
        DashboardModuleCatalogRepository moduleCatalogRepository,
        OrganizationScopeAccess organizationScopeAccess
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.moduleAccessRepository = moduleAccessRepository;
        this.moduleCatalogRepository = moduleCatalogRepository;
        this.organizationScopeAccess = organizationScopeAccess;
    }

    public List<ModuleListItem> listModules(long userId, long companyId, String role) {
        var moduleAccess = moduleAccessRepository.loadAccess(userId, companyId, role);
        return moduleCatalogRepository.listModules(userId, moduleAccess);
    }

    public List<UnitSummary> listUnits(long companyId) {
        var corporateUnit = ensureHeadquartersBusinesses(companyId);
        var units = jdbcTemplate.query(
            """
                SELECT id, name, description, status
                FROM units
                WHERE (company_id = ? OR company_id IS NULL)
                  AND (status = 'active' OR status IS NULL OR status = '')
                ORDER BY name ASC
                """,
            (rs, rowNum) -> new UnitSummary(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("description"),
                rs.getString("status")
            ),
            companyId
        );

        if (corporateUnit == null) {
            return units;
        }

        return units.stream()
            .filter((unit) -> !isCorporateOfficeName(unit.name()) || unit.id() == corporateUnit.id())
            .toList();
    }

    public List<UnitSummary> listUnits(AuthSessionUser currentUser) {
        var scope = organizationScopeAccess.resolve(currentUser);
        return organizationScopeAccess.filterUnits(
            currentUser.companyId(),
            scope,
            listUnits(currentUser.companyId())
        );
    }

    public List<BusinessSummary> listBusinesses(long companyId) {
        ensureHeadquartersBusinesses(companyId);

        return jdbcTemplate.query(
            """
                SELECT id, unit_id, name, address, description, status
                FROM businesses
                WHERE (company_id = ? OR company_id IS NULL)
                  AND (status = 'active' OR status IS NULL OR status = '')
                ORDER BY name ASC
                """,
            (rs, rowNum) -> new BusinessSummary(
                rs.getLong("id"),
                getNullableLong(rs, "unit_id"),
                rs.getString("name"),
                rs.getString("address"),
                rs.getString("description"),
                rs.getString("status")
            ),
            companyId
        );
    }

    public List<BusinessSummary> listBusinesses(AuthSessionUser currentUser) {
        var scope = organizationScopeAccess.resolve(currentUser);
        return organizationScopeAccess.filterBusinesses(scope, listBusinesses(currentUser.companyId()));
    }

    private UnitRef ensureHeadquartersBusinesses(long companyId) {
        var units = loadActiveUnitRefs(companyId);

        if (units.isEmpty()) {
            return null;
        }

        var corporateUnit = resolveCorporateOfficeUnit(companyId, units);
        normalizeCorporateOfficeBusiness(companyId, corporateUnit);

        units = loadActiveUnitRefs(companyId);
        var existingBusinesses = loadActiveBusinessRefs(companyId);
        var existingBusinessKeys = new SetBackedKeys();
        for (var business : existingBusinesses) {
            existingBusinessKeys.add(business.unitId(), business.name());
        }

        for (var unit : units) {
            if (unit.id() == corporateUnit.id()) {
                insertHeadquartersBusinessIfMissing(companyId, unit, CORPORATE_OFFICE_UNIT_NAME, existingBusinessKeys);
                continue;
            }

            insertHeadquartersBusinessIfMissing(
                companyId,
                unit,
                firstNonBlank(unit.name(), "Unit") + UNIT_HEADQUARTERS_SUFFIX,
                existingBusinessKeys
            );
        }

        return corporateUnit;
    }

    private List<UnitRef> loadActiveUnitRefs(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT id, company_id, name
                FROM units
                WHERE (company_id = ? OR company_id IS NULL)
                  AND (status = 'active' OR status IS NULL OR status = '')
                ORDER BY id ASC
                """,
            (rs, rowNum) -> new UnitRef(
                rs.getLong("id"),
                getNullableLong(rs, "company_id"),
                rs.getString("name")
            ),
            companyId
        );
    }

    private List<BusinessRef> loadActiveBusinessRefs(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT id, unit_id, name
                FROM businesses
                WHERE (company_id = ? OR company_id IS NULL)
                  AND (status = 'active' OR status IS NULL OR status = '')
                ORDER BY id ASC
                """,
            (rs, rowNum) -> new BusinessRef(
                rs.getLong("id"),
                getNullableLong(rs, "unit_id"),
                rs.getString("name")
            ),
            companyId
        );
    }

    private UnitRef resolveCorporateOfficeUnit(long companyId, List<UnitRef> units) {
        var corporateOfficeUnits = units.stream()
            .filter((unit) -> isCorporateOfficeName(unit.name()))
            .sorted((first, second) -> {
                var firstBelongsToCompany = Long.valueOf(companyId).equals(first.companyId());
                var secondBelongsToCompany = Long.valueOf(companyId).equals(second.companyId());
                if (firstBelongsToCompany != secondBelongsToCompany) {
                    return firstBelongsToCompany ? -1 : 1;
                }
                return Long.compare(first.id(), second.id());
            })
            .toList();

        if (!corporateOfficeUnits.isEmpty()) {
            var canonicalCorporateUnit = corporateOfficeUnits.get(0);
            jdbcTemplate.update(
                """
                    UPDATE units
                    SET name = ?, status = 'active'
                    WHERE id = ? AND company_id = ?
                    """,
                CORPORATE_OFFICE_UNIT_NAME,
                canonicalCorporateUnit.id(),
                companyId
            );

            for (var index = 1; index < corporateOfficeUnits.size(); index++) {
                var duplicateCorporateUnit = corporateOfficeUnits.get(index);
                if (duplicateCorporateUnit.id() == canonicalCorporateUnit.id()) {
                    continue;
                }
                if (!Long.valueOf(companyId).equals(duplicateCorporateUnit.companyId())) {
                    continue;
                }
                mergeDuplicateCorporateUnit(companyId, canonicalCorporateUnit.id(), duplicateCorporateUnit.id());
            }

            return new UnitRef(canonicalCorporateUnit.id(), canonicalCorporateUnit.companyId(), CORPORATE_OFFICE_UNIT_NAME);
        }

        jdbcTemplate.update(
            "INSERT INTO units (company_id, name, status) VALUES (?, ?, 'active')",
            companyId,
            CORPORATE_OFFICE_UNIT_NAME
        );
        var corporateOfficeUnitId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        return new UnitRef(corporateOfficeUnitId == null ? 0L : corporateOfficeUnitId, companyId, CORPORATE_OFFICE_UNIT_NAME);
    }

    private void mergeDuplicateCorporateUnit(long companyId, long canonicalCorporateUnitId, long duplicateCorporateUnitId) {
        jdbcTemplate.update(
            """
                UPDATE businesses
                SET unit_id = ?
                WHERE unit_id = ? AND (company_id = ? OR company_id IS NULL)
                """,
            canonicalCorporateUnitId,
            duplicateCorporateUnitId,
            companyId
        );
        jdbcTemplate.update(
            """
                UPDATE user_work_profiles
                SET unit_id = ?
                WHERE company_id = ? AND unit_id = ?
                """,
            canonicalCorporateUnitId,
            companyId,
            duplicateCorporateUnitId
        );
        jdbcTemplate.update(
            """
                UPDATE attendance_locations
                SET unit_id = ?
                WHERE company_id = ? AND unit_id = ?
                """,
            canonicalCorporateUnitId,
            companyId,
            duplicateCorporateUnitId
        );
        jdbcTemplate.update(
            """
                UPDATE attendance_kiosk_devices
                SET unit_id = ?
                WHERE company_id = ? AND unit_id = ?
                """,
            canonicalCorporateUnitId,
            companyId,
            duplicateCorporateUnitId
        );
        jdbcTemplate.update(
            """
                UPDATE units
                SET name = ?, status = 'inactive'
                WHERE id = ? AND company_id = ?
                """,
            CORPORATE_OFFICE_UNIT_NAME + " (archived " + duplicateCorporateUnitId + ")",
            duplicateCorporateUnitId,
            companyId
        );
    }

    private void normalizeCorporateOfficeBusiness(long companyId, UnitRef corporateUnit) {
        var corporateOfficeBusinesses = new ArrayList<BusinessRef>();
        for (var business : loadActiveBusinessRefs(companyId)) {
            if (isCorporateOfficeName(business.name())) {
                corporateOfficeBusinesses.add(business);
            }
        }

        if (corporateOfficeBusinesses.isEmpty()) {
            return;
        }

        corporateOfficeBusinesses.sort((first, second) -> {
            var firstIsAlreadyCorporate = corporateUnit.id() == nullSafeLong(first.unitId());
            var secondIsAlreadyCorporate = corporateUnit.id() == nullSafeLong(second.unitId());
            if (firstIsAlreadyCorporate != secondIsAlreadyCorporate) {
                return firstIsAlreadyCorporate ? -1 : 1;
            }
            return Long.compare(first.id(), second.id());
        });

        var canonicalBusiness = corporateOfficeBusinesses.get(0);
        jdbcTemplate.update(
            """
                UPDATE businesses
                SET unit_id = ?, name = ?, status = 'active'
                WHERE id = ? AND (company_id = ? OR company_id IS NULL)
                """,
            corporateUnit.id(),
            CORPORATE_OFFICE_UNIT_NAME,
            canonicalBusiness.id(),
            companyId
        );
        moveCorporateBusinessReferences(companyId, corporateUnit.id(), canonicalBusiness.id(), canonicalBusiness.id());

        for (var index = 1; index < corporateOfficeBusinesses.size(); index++) {
            var duplicateBusiness = corporateOfficeBusinesses.get(index);
            moveCorporateBusinessReferences(companyId, corporateUnit.id(), canonicalBusiness.id(), duplicateBusiness.id());
            jdbcTemplate.update(
                """
                    UPDATE businesses
                    SET status = 'inactive'
                    WHERE id = ? AND (company_id = ? OR company_id IS NULL)
                    """,
                duplicateBusiness.id(),
                companyId
            );
        }
    }

    private void moveCorporateBusinessReferences(
        long companyId,
        long corporateUnitId,
        long canonicalCorporateBusinessId,
        long previousBusinessId
    ) {
        jdbcTemplate.update(
            """
                UPDATE user_work_profiles
                SET unit_id = ?, business_id = ?
                WHERE company_id = ? AND business_id = ?
                """,
            corporateUnitId,
            canonicalCorporateBusinessId,
            companyId,
            previousBusinessId
        );
        jdbcTemplate.update(
            """
                UPDATE attendance_locations
                SET unit_id = ?, business_id = ?
                WHERE company_id = ? AND business_id = ?
                """,
            corporateUnitId,
            canonicalCorporateBusinessId,
            companyId,
            previousBusinessId
        );
        jdbcTemplate.update(
            """
                UPDATE attendance_kiosk_devices
                SET unit_id = ?, business_id = ?
                WHERE company_id = ? AND business_id = ?
                """,
            corporateUnitId,
            canonicalCorporateBusinessId,
            companyId,
            previousBusinessId
        );
    }

    private void insertHeadquartersBusinessIfMissing(
        long companyId,
        UnitRef unit,
        String businessName,
        SetBackedKeys existingBusinessKeys
    ) {
        if (existingBusinessKeys.contains(unit.id(), businessName)) {
            return;
        }

        jdbcTemplate.update(
            """
                INSERT INTO businesses (company_id, unit_id, name, status)
                VALUES (?, ?, ?, 'active')
                """,
            companyId,
            unit.id(),
            businessName
        );
        existingBusinessKeys.add(unit.id(), businessName);
    }

    private String firstNonBlank(String... values) {
        for (var value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    private String normalizeKey(String value) {
        return firstNonBlank(value).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
    }

    private boolean isCorporateOfficeName(String value) {
        return CORPORATE_OFFICE_KEYS.contains(normalizeKey(value));
    }

    private long nullSafeLong(Long value) {
        return value == null ? Long.MIN_VALUE : value;
    }

    private record UnitRef(long id, Long companyId, String name) {
    }

    private record BusinessRef(long id, Long unitId, String name) {
    }

    private static final class SetBackedKeys {
        private final Map<String, Boolean> keys = new LinkedHashMap<>();

        private void add(Long unitId, String name) {
            keys.put(key(unitId, name), true);
        }

        private boolean contains(Long unitId, String name) {
            return keys.containsKey(key(unitId, name));
        }

        private String key(Long unitId, String name) {
            return String.valueOf(unitId) + "::" + (name == null ? "" : name.trim().toLowerCase(Locale.ROOT));
        }
    }

    private Long getNullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    public record UnitSummary(
        long id,
        String name,
        String description,
        String status
    ) {
    }

    public record BusinessSummary(
        long id,
        Long unitId,
        String name,
        String address,
        String description,
        String status
    ) {
    }
}
