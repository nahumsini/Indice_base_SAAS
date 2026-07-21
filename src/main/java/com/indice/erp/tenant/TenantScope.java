package com.indice.erp.tenant;

public record TenantScope(
    String type,
    Long unit_id,
    Long business_id
) {

    public static TenantScope from(Long unitId, Long businessId) {
        if (businessId != null) {
            return new TenantScope("business_office", unitId, businessId);
        }
        if (unitId != null) {
            return new TenantScope("unit_headquarters", unitId, null);
        }
        return new TenantScope("corporate_office", null, null);
    }
}
