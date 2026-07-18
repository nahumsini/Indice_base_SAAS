package com.indice.erp.kiosk.engine;

public record KioskSessionLaunch(
        KioskSessionPrincipal session,
        String accessToken) {
}
