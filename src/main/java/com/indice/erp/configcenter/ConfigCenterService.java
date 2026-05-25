package com.indice.erp.configcenter;

import com.indice.erp.auth.AuthSessionUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.configcenter.structure.ConfigCenterBusinessStructureUseCases;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class ConfigCenterService extends ConfigCenterBusinessStructureUseCases {

    private final ConfigCenterScopeAccess scopeAccess;

    public ConfigCenterService(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        BCryptPasswordEncoder passwordEncoder,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties,
        ConfigCenterScopeAccess scopeAccess
    ) {
        super(jdbcTemplate, objectMapper, passwordEncoder, objectStorageService, objectStorageProperties);
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
}
