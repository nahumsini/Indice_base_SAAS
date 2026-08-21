package com.indice.erp.auth;

import java.util.List;

public record ManagedCompanyContextResponse(
    String authority_mode,
    Long authority_company_id,
    String authority_company_name,
    boolean active,
    ManagedCompany active_company,
    boolean read_only,
    List<ManagedCompany> companies
) {
    public record ManagedCompany(
        long id,
        String name,
        String access_mode,
        boolean active,
        boolean read_only
    ) {
    }
}
