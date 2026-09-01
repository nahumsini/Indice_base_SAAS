package com.indice.erp.kiosk.engine;

import java.util.Set;

/** Canonical channel names used to route Kiosk Engine operations. */
public final class KioskExecutionChannels {

    public static final String PUBLIC_LINK = "PUBLIC_LINK";
    public static final String LEGACY_PUBLIC_LINK = "LEGACY_PUBLIC_LINK";
    public static final String AUTHENTICATED_WEB = "AUTHENTICATED_WEB";
    public static final String MOBILE_MULTI_KIOSK = "MOBILE_MULTI_KIOSK";

    private static final Set<String> EMPLOYEE_CHANNELS = Set.of(
        AUTHENTICATED_WEB,
        MOBILE_MULTI_KIOSK
    );

    private KioskExecutionChannels() {
    }

    public static boolean isEmployeeChannel(String channel) {
        return EMPLOYEE_CHANNELS.contains(channel);
    }

    /** Maps request contexts to the exact channel persisted on controlled sessions. */
    public static String persistedSessionChannel(String requestChannel) {
        return switch (requestChannel) {
            case PUBLIC_LINK, LEGACY_PUBLIC_LINK -> PUBLIC_LINK;
            case AUTHENTICATED_WEB -> AUTHENTICATED_WEB;
            case MOBILE_MULTI_KIOSK -> MOBILE_MULTI_KIOSK;
            default -> throw new SecurityException("Unsupported kiosk execution channel.");
        };
    }
}
