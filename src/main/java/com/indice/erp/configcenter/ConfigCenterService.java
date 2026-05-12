package com.indice.erp.configcenter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.configcenter.structure.ConfigCenterBusinessStructureUseCases;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class ConfigCenterService extends ConfigCenterBusinessStructureUseCases {

    public ConfigCenterService(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        BCryptPasswordEncoder passwordEncoder,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties
    ) {
        super(jdbcTemplate, objectMapper, passwordEncoder, objectStorageService, objectStorageProperties);
    }
}
