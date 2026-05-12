package com.indice.erp.configcenter.support;

import java.util.List;

public record UnitInput(
    String name,
    Long legacyUnitId,
    boolean corporateOffice,
    String logo,
    String industria,
    String direccion,
    String ciudad,
    String estado,
    String pais,
    String cp,
    String telefono,
    String email,
    CoordinateInput coordinates,
    List<BusinessInput> businesses
) {
}
