package com.indice.erp.billing.storage;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.PresignedUpload;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CompanyStorageMeterTest {

    @Mock
    private StorageQuotaService quota;

    @Mock
    private ObjectStorageService storage;

    private CompanyStorageMeter meter;

    @BeforeEach
    void setUp() {
        meter = new CompanyStorageMeter(quota, storage);
    }

    @Test
    void reservesBeforeSigningTheExactExpectedLength() {
        var expected = new PresignedUpload(
            "tenant/report.pdf",
            "https://storage.example/upload",
            Instant.parse("2026-07-21T12:00:00Z"),
            Map.of("Content-Type", "application/pdf"));
        when(storage.presignUpload(
            "documents", "tenant/report.pdf", "application/pdf", 2048L, 900))
            .thenReturn(expected);

        var actual = meter.presign(
            7L, "EXPENSES", "documents", "tenant/report.pdf",
            "application/pdf", 2048L, 900);

        assertSame(expected, actual);
        var order = inOrder(quota, storage);
        order.verify(quota).reserve(
            7L, "EXPENSES", "documents", "tenant/report.pdf", 2048L);
        order.verify(storage).presignUpload(
            "documents", "tenant/report.pdf", "application/pdf", 2048L, 900);
    }

    @Test
    void releasesTheReservationWhenSigningFails() {
        var failure = new IllegalStateException("storage unavailable");
        when(storage.presignUpload(
            "documents", "tenant/report.pdf", "application/pdf", 2048L, 900))
            .thenThrow(failure);

        var thrown = assertThrows(IllegalStateException.class, () -> meter.presign(
            7L, "EXPENSES", "documents", "tenant/report.pdf",
            "application/pdf", 2048L, 900));

        assertSame(failure, thrown);
        var order = inOrder(quota, storage);
        order.verify(quota).reserve(
            7L, "EXPENSES", "documents", "tenant/report.pdf", 2048L);
        order.verify(storage).presignUpload(
            "documents", "tenant/report.pdf", "application/pdf", 2048L, 900);
        order.verify(quota).release(7L, "tenant/report.pdf", "presign_failed");
    }
}
