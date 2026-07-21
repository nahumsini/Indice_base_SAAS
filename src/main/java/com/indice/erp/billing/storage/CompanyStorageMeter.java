package com.indice.erp.billing.storage;

import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.PresignedUpload;
import java.time.Duration;
import org.springframework.stereotype.Service;

/**
 * Single application boundary for durable tenant uploads. It reserves quota before a client
 * receives a write URL, signs the exact expected length, and commits only after storage can
 * prove that the object exists with the approved size.
 */
@Service
public class CompanyStorageMeter {

    private final StorageQuotaService quota;
    private final ObjectStorageService storage;

    public CompanyStorageMeter(StorageQuotaService quota, ObjectStorageService storage) {
        this.quota = quota;
        this.storage = storage;
    }

    public PresignedUpload presign(long companyId, String ownerModule, String bucketName,
                                   String objectKey, String contentType, long sizeBytes,
                                   int expirySeconds) {
        quota.reserve(companyId, ownerModule, bucketName, objectKey, sizeBytes);
        try {
            return storage.presignUpload(
                bucketName, objectKey, contentType, sizeBytes, expirySeconds);
        } catch (RuntimeException failure) {
            quota.release(companyId, objectKey, "presign_failed");
            throw failure;
        }
    }

    public StorageQuotaService.Reservation reserve(long companyId, String ownerModule,
                                                   String bucketName, String objectKey,
                                                   long sizeBytes) {
        return quota.reserve(companyId, ownerModule, bucketName, objectKey, sizeBytes);
    }

    public StorageQuotaService.CommitResult commit(long companyId, String bucketName,
                                                    String objectKey, long expectedBytes) {
        return quota.commitStoredObject(companyId, bucketName, objectKey, expectedBytes);
    }

    public StorageQuotaService.CommitResult commitMoved(long companyId, String bucketName,
                                                         String reservedObjectKey,
                                                         String storedObjectKey,
                                                         long expectedBytes) {
        return quota.commitStoredObject(
            companyId, bucketName, reservedObjectKey, storedObjectKey, expectedBytes);
    }

    public void release(long companyId, String objectKey, String reason) {
        quota.release(companyId, objectKey, reason);
    }

    public Duration reservationTtl() {
        return quota.reservationTtl();
    }
}
