package com.indice.erp.billing.storage;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class StorageQuotaExceptionHandler {

    @ExceptionHandler(StorageQuotaExceededException.class)
    public ResponseEntity<?> quotaExceeded(StorageQuotaExceededException exception) {
        var snapshot = exception.snapshot();
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(Map.of(
            "code", "STORAGE_QUOTA_EXCEEDED",
            "message", exception.getMessage(),
            "limit_bytes", snapshot.limitBytes(),
            "used_bytes", snapshot.usedBytes(),
            "reserved_bytes", snapshot.reservedBytes(),
            "available_bytes", snapshot.availableBytes()));
    }
}
