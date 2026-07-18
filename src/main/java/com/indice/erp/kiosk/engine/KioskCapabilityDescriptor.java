package com.indice.erp.kiosk.engine;

import java.util.Objects;

public record KioskCapabilityDescriptor(
        String key,
        int version,
        String ownerModule,
        KioskOperationPolicy operationPolicy,
        KioskAccessLevel accessLevel,
        boolean mutation,
        boolean sensitive,
        java.util.Map<String, Object> inputContract,
        java.util.Map<String, Object> resultContract,
        java.util.Map<String, Object> filePolicy) {

    public KioskCapabilityDescriptor(
            String key,
            int version,
            String ownerModule,
            KioskOperationPolicy operationPolicy,
            KioskAccessLevel accessLevel,
            boolean mutation,
            boolean sensitive) {
        this(key, version, ownerModule, operationPolicy, accessLevel, mutation, sensitive,
            java.util.Map.of(), java.util.Map.of(), java.util.Map.of());
    }

    public KioskCapabilityDescriptor {
        key = requireText(key, "key");
        ownerModule = requireText(ownerModule, "ownerModule");
        Objects.requireNonNull(operationPolicy, "operationPolicy is required.");
        Objects.requireNonNull(accessLevel, "accessLevel is required.");
        if (version < 1) {
            throw new IllegalArgumentException("version must be at least 1.");
        }
        inputContract = inputContract == null ? java.util.Map.of() : java.util.Map.copyOf(inputContract);
        resultContract = resultContract == null ? java.util.Map.of() : java.util.Map.copyOf(resultContract);
        filePolicy = filePolicy == null ? java.util.Map.of() : java.util.Map.copyOf(filePolicy);
    }

    public String versionedKey() {
        return key + "@" + version;
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required.");
        }
        return value.trim();
    }
}
