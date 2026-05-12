package com.indice.erp.configcenter.support;

public record BusinessInput(
    String name,
    Long legacyBusinessId,
    String logo,
    String industria,
    String direccion,
    String ciudad,
    String estado,
    String pais,
    String cp,
    String telefono,
    String email,
    String gerente,
    String horario,
    CoordinateInput coordinates
) {
}
