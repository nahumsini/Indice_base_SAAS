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
        return config;
    }

    @Transactional
    public Map<String, Object> saveStructure(AuthSessionUser currentUser, Map<String, Object> payload) {
        var scope = scopeAccess.resolve(currentUser);
        if (!scope.isCorporateOffice()) {
            throw new HrAccessDeniedException("Forbidden");
        }
        return saveStructure(currentUser.companyId(), currentUser.userId(), payload);
    }
}
