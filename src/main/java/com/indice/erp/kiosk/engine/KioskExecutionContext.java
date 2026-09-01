package com.indice.erp.kiosk.engine;

import java.util.Objects;

public record KioskExecutionContext(
        String ownerModule,
        String channel,
        String accessReference,
        String networkSignal,
        String browserSessionReference,
        KioskResolvedDefinition definition,
        KioskSessionPrincipal session) {

    public KioskExecutionContext(String ownerModule, String channel, String accessReference) {
        this(ownerModule, channel, accessReference, "unknown", "unknown", null, null);
    }

    public KioskExecutionContext(
            String ownerModule,
            String channel,
            String accessReference,
            String networkSignal,
            String browserSessionReference) {
        this(ownerModule, channel, accessReference, networkSignal, browserSessionReference, null, null);
    }

    public KioskExecutionContext {
        ownerModule = requireText(ownerModule, "ownerModule");
        channel = requireText(channel, "channel");
        accessReference = requireText(accessReference, "accessReference");
        networkSignal = optionalSignal(networkSignal);
        browserSessionReference = optionalSignal(browserSessionReference);
    }

    public static KioskExecutionContext publicLink(String ownerModule, String accessReference) {
        return new KioskExecutionContext(ownerModule, KioskExecutionChannels.PUBLIC_LINK, accessReference);
    }

    public static KioskExecutionContext publicLink(
            String ownerModule,
            String accessReference,
            String networkSignal,
            String browserSessionReference) {
        return new KioskExecutionContext(
            ownerModule, KioskExecutionChannels.PUBLIC_LINK, accessReference,
            networkSignal, browserSessionReference, null, null);
    }

    public KioskExecutionContext resolved(
            KioskResolvedDefinition resolvedDefinition,
            KioskSessionPrincipal resolvedSession) {
        Objects.requireNonNull(resolvedDefinition, "resolvedDefinition is required.");
        return new KioskExecutionContext(
            ownerModule, channel, accessReference, networkSignal, browserSessionReference,
            resolvedDefinition, resolvedSession);
    }

    private static String requireText(String value, String field) {
        Objects.requireNonNull(value, field + " is required.");
        if (value.isBlank()) {
            throw new IllegalArgumentException(field + " is required.");
        }
        return value.trim();
    }

    private static String optionalSignal(String value) {
        return value == null || value.isBlank() ? "unknown" : value.trim();
    }
}
