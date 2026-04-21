package com.indice.erp.storage;

import java.time.Instant;
import java.util.Map;

public record PresignedUpload(
    String objectKey,
    String uploadUrl,
    Instant expiresAt,
    Map<String, String> uploadHeaders
) {
}
