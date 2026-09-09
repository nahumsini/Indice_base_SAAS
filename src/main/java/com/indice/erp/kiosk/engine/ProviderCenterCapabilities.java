package com.indice.erp.kiosk.engine;

import java.util.Set;

/** Read-only coordination capabilities owned by the provider launcher. */
public final class ProviderCenterCapabilities {

    public static final String OWNER_MODULE = "PROVIDER_CENTER";
    public static final String KIOSK_TYPE = "provider_tracking";
    public static final String TRACKING_READ = "provider.tracking.read";

    private static final Set<KioskCapabilityDescriptor> DESCRIPTORS = Set.of(
        new KioskCapabilityDescriptor(
            TRACKING_READ, 1, OWNER_MODULE, KioskOperationPolicy.INFORMATION_ONLY,
            KioskAccessLevel.CONTROLLED, false, true)
    );

    private ProviderCenterCapabilities() {
    }

    public static Set<KioskCapabilityDescriptor> descriptors() {
        return DESCRIPTORS;
    }
}
