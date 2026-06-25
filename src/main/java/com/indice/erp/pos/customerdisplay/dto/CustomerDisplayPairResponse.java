package com.indice.erp.pos.customerdisplay.dto;

public record CustomerDisplayPairResponse(
        String deviceToken,
        String displayUrl,
        Long cashRegisterId,
        String cashRegisterCode,
        String cashRegisterName) {
}
