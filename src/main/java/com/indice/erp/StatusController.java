package com.indice.erp;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatusController {

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
            "status", "ok"
        );
    }
}
