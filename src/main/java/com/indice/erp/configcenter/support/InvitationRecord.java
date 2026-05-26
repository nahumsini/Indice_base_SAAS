package com.indice.erp.configcenter.support;

import java.time.LocalDateTime;
import java.util.List;

public record InvitationRecord(
    long id,
    long companyId,
    String email,
    String fullName,
    String role,
    List<String> moduleSlugs,
    Long unitId,
    Long businessId,
    String token,
    String status,
    LocalDateTime expiresAt,
    String companyName
) {
}
