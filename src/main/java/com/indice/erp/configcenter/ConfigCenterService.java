package com.indice.erp.configcenter;

import com.indice.erp.auth.AuthSessionUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.configcenter.structure.ConfigCenterBusinessStructureUseCases;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConfigCenterService extends ConfigCenterBusinessStructureUseCases {

    private final ConfigCenterScopeAccess scopeAccess;

    public ConfigCenterService(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        BCryptPasswordEncoder passwordEncoder,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties,
        CompanyStorageMeter storageMeter,
        ConfigCenterScopeAccess scopeAccess
    ) {
        super(jdbcTemplate, objectMapper, passwordEncoder, objectStorageService, objectStorageProperties, storageMeter);
        this.scopeAccess = scopeAccess;
    }

    public Map<String, Object> getEmpresa(AuthSessionUser currentUser) {
        return scopeAccess.scopeEmpresa(currentUser, getEmpresa(currentUser.companyId()));
    }

    public Object getConfig(AuthSessionUser currentUser) {
        var empresa = getEmpresa(currentUser);
        var config = new LinkedHashMap<String, Object>();
        config.put("estructura", empresa.get("estructura"));
        config.put("colaboradores", empresa.get("colaboradores"));
        config.put("empresa_template", empresa.get("empresa_template"));
        config.put("map", empresa.get("map"));
        var scope = scopeAccess.resolve(currentUser);
        config.put("can_edit", scope != null && scope.isCorporateOffice());
        return config;
    }

    @Transactional
    public Map<String, Object> saveCompany(AuthSessionUser currentUser, Map<String, Object> payload) {
        requireCorporateScope(currentUser);
        lockCompany(currentUser.companyId());
        return saveEmpresa(currentUser.companyId(),currentUser.userId(),payload);
    }

    @Transactional
    public Map<String, Object> saveStructure(AuthSessionUser currentUser, Map<String, Object> payload) {
        requireCorporateScope(currentUser);
        lockCompany(currentUser.companyId());
        if (payload.containsKey("company")) {
            if (!(payload.get("map") instanceof java.util.List<?> units) || units.stream().anyMatch(unit -> !(unit instanceof Map<?,?> map) || !(map.get("businesses") instanceof java.util.List<?>)))
                throw com.indice.erp.configcenter.company.CompanySettingsInput.error("company_invalid_organization","Send the complete organization list.");
            if (!(payload.get("company") instanceof Map<?,?> raw))
                throw com.indice.erp.configcenter.company.CompanySettingsInput.error("company_invalid_organization","Company data is invalid.");
            var company = new LinkedHashMap<String,Object>();
            raw.forEach((key,value)->company.put(String.valueOf(key),value));
            // One transaction includes the general identity and complete organization, with their existing owners.
            saveEmpresa(currentUser.companyId(),currentUser.userId(),company);
        }
        var result = new LinkedHashMap<>(saveStructure(currentUser.companyId(),currentUser.userId(),payload));
        if (payload.containsKey("company")) result.put("company",getEmpresa(currentUser.companyId()));
        return result;
    }

    private void requireCorporateScope(AuthSessionUser currentUser) {
        var scope = scopeAccess.resolve(currentUser);
        if (scope == null || !scope.isCorporateOffice()) throw new HrAccessDeniedException("Forbidden");
    }
    private void lockCompany(long companyId) {
        jdbcTemplate.queryForObject("SELECT id FROM companies WHERE id = ? FOR UPDATE",Long.class,companyId);
    }
}
