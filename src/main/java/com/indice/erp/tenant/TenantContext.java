package com.indice.erp.tenant;

public record TenantContext(
    long user_id,
    long company_id,
    Long user_company_id,
    String role,
    TenantScope scope
) {
}
