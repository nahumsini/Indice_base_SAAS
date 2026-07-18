package com.indice.erp.kiosk.engine;

import java.util.Objects;

/**
 * Tenant-bound lifecycle command handed from the transversal Kiosk Center to
 * the module that owns the kiosk's functional state.
 */
public record KioskLifecycleTransition(
        KioskResolvedDefinition definition,
        long actorId,
        KioskDefinitionStatus target,
        String reason) {

    public KioskLifecycleTransition {
        Objects.requireNonNull(definition, "definition is required.");
        Objects.requireNonNull(target, "target is required.");
        if (actorId <= 0) {
            throw new IllegalArgumentException("actorId must be positive.");
        }
        reason = normalizeReason(reason);
    }

    public long companyId() {
        return definition.companyId();
    }

    public long legacyReferenceId() {
        if (definition.legacyReferenceId() == null) {
            throw new KioskUnavailableException();
        }
        return definition.legacyReferenceId();
    }

    private static String normalizeReason(String value) {
        if (value == null) {
            return null;
        }
        var normalized = value.trim();
        if (normalized.length() > 500) {
            throw new IllegalArgumentException("Lifecycle reason must not exceed 500 characters.");
        }
        return normalized.isEmpty() ? null : normalized;
    }
}
