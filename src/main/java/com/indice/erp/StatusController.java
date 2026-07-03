package com.indice.erp;

import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatusController {

    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties objectStorageProperties;

    public StatusController(
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties
    ) {
        this.objectStorageService = objectStorageService;
        this.objectStorageProperties = objectStorageProperties;
    }

    @GetMapping("/")
    public Map<String, Object> root() {
        return Map.of(
            "name", "indice-erp-api",
            "status", "ok",
            "version", "0.0.1-SNAPSHOT"
        );
    }

    @GetMapping("/api/v1/health")
    public Map<String, Object> health() {
        return Map.of(
            "name", "indice-erp-api",
            "status", "ok",
            "storage", Map.of(
                "enabled", objectStorageService.isEnabled(),
                "provider", objectStorageProperties.getProvider(),
                "required", objectStorageProperties.isRequired()
            )
        );
    }
}
