package com.indice.erp.configcenter.support;

public record HeadquartersLocationInput(
    CoordinateInput coordinates,
    boolean hasCoordinatePayload,
    HeadquartersAddressInput address
) {
}
