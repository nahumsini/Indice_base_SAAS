package com.indice.erp.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import io.minio.MinioClient;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MinioObjectStorageServiceTest {

    @Mock
    private MinioClient minioClient;

    private ObjectStorageProperties properties;
    private MinioObjectStorageService service;

    @BeforeEach
    void setUp() {
        properties = new ObjectStorageProperties();
        properties.setProvider("minio");
        properties.getMinio().setEndpoint("http://127.0.0.1:9000");
        properties.getMinio().setPublicEndpoint("http://cdn.example.test:9000");
        properties.getMinio().setAccessKey("minioadmin");
        properties.getMinio().setSecretKey("minioadmin");
        properties.getMinio().setBucketAttendance("indice-hr-attendance");
        properties.getMinio().setPresignExpirySeconds(900);
        service = new MinioObjectStorageService(minioClient, properties);
    }

    @Test
    void ensureBucketExistsDoesNotCreateWhenBucketAlreadyExists() throws Exception {
        given(minioClient.bucketExists(any())).willReturn(true);

        service.ensureBucketExists("indice-hr-attendance");

        verify(minioClient, never()).makeBucket(any());
    }

    @Test
    void presignUploadReturnsObjectKeyAndUrl() throws Exception {
        given(minioClient.getPresignedObjectUrl(any())).willReturn(
            "http://minio:9000/indice-hr-attendance/upload-url"
                + "?X-Amz-Credential=minioadmin%2F20260720%2Fus-east-1%2Fs3%2Faws4_request"
                + "&X-Amz-SignedHeaders=content-length%3Bcontent-type%3Bhost"
                + "&X-Amz-Signature=test"
        );

        var upload = service.presignUpload("indice-hr-attendance", "hr/attendance/1/2/demo.jpg", "image/jpeg", 900);

        assertThat(upload.objectKey()).isEqualTo("hr/attendance/1/2/demo.jpg");
        assertThat(upload.uploadUrl()).isEqualTo(
            "http://cdn.example.test:9000/indice-hr-attendance/upload-url"
                + "?X-Amz-Credential=minioadmin%2F20260720%2Fus-east-1%2Fs3%2Faws4_request"
                + "&X-Amz-SignedHeaders=content-length%3Bcontent-type%3Bhost"
                + "&X-Amz-Signature=test"
        );
        assertThat(upload.uploadHeaders()).containsEntry("Content-Type", "image/jpeg");
        assertThat(upload.expiresAt()).isAfter(Instant.now());
    }

    @Test
    void presignDownloadReturnsSignedUrl() throws Exception {
        given(minioClient.getPresignedObjectUrl(any())).willReturn(
            "http://minio:9000/indice-hr-attendance/download-url?X-Amz-Signature=test"
        );

        var downloadUrl = service.presignDownload("indice-hr-attendance", "hr/attendance/1/2/demo.jpg", 900);

        assertThat(downloadUrl).isEqualTo(
            "http://cdn.example.test:9000/indice-hr-attendance/download-url?X-Amz-Signature=test"
        );
    }

    @Test
    void objectExistsReturnsTrueWhenStatSucceeds() throws Exception {
        given(minioClient.statObject(any())).willReturn(null);

        assertTrue(service.objectExists("indice-hr-attendance", "hr/attendance/1/2/demo.jpg"));
    }

    @Test
    void disabledStorageReportsDisabled() {
        var disabled = new DisabledObjectStorageService();

        assertFalse(disabled.isEnabled());
    }

    @Test
    void completeObjectAtAcceptedLimitIsReturnedWithoutRequiringCallerLookahead() throws Exception {
        byte[] bytes = new byte[10 * 1024 * 1024];
        var response = new io.minio.GetObjectResponse(new okhttp3.Headers.Builder().build(),
            "private-bucket", "us-east-1", "document", new java.io.ByteArrayInputStream(bytes));
        given(minioClient.getObject(any())).willReturn(response);

        assertThat(service.readObject("private-bucket", "document", bytes.length)).isEqualTo(bytes);
    }

    @Test
    void oversizedObjectIsRejectedInsteadOfReturningTruncatedContent() throws Exception {
        var response = new io.minio.GetObjectResponse(new okhttp3.Headers.Builder().build(),
            "private-bucket", "us-east-1", "document", new java.io.ByteArrayInputStream(new byte[4]));
        given(minioClient.getObject(any())).willReturn(response);

        assertThatThrownBy(() -> service.readObject("private-bucket", "document", 3))
            .isInstanceOf(IllegalArgumentException.class).hasMessage("Stored file exceeds the size limit.");
    }

    @Test
    void invalidReadBudgetIsRejectedBeforeContactingStorage() throws Exception {
        assertThatThrownBy(() -> service.readObject("private-bucket", "document", 10 * 1024 * 1024 + 1))
            .isInstanceOf(IllegalArgumentException.class).hasMessage("Invalid file size limit.");
        verify(minioClient, never()).getObject(any());
    }
    @Test
    void boundedStreamCopiesRequestedRangeAndRejectsTruncation() throws Exception {
        var response = new io.minio.GetObjectResponse(new okhttp3.Headers.Builder().build(),
            "private-bucket", "us-east-1", "document", new java.io.ByteArrayInputStream("range".getBytes()));
        given(minioClient.getObject(any())).willReturn(response);
        var output = new java.io.ByteArrayOutputStream();
        service.streamObject("private-bucket", "document", 2, 5, output);
        assertThat(output.toString()).isEqualTo("range");
        var shortResponse = new io.minio.GetObjectResponse(new okhttp3.Headers.Builder().build(),
            "private-bucket", "us-east-1", "document", new java.io.ByteArrayInputStream(new byte[2]));
        given(minioClient.getObject(any())).willReturn(shortResponse);
        assertThatThrownBy(() -> service.streamObject("private-bucket", "document", 0, 3, new java.io.ByteArrayOutputStream()))
            .isInstanceOf(ObjectStorageException.class);
    }
    @Test
    void invalidStreamRangeNeverContactsProvider() throws Exception {
        assertThatThrownBy(() -> service.streamObject("private-bucket", "document", 0, 100L * 1024 * 1024 + 1, new java.io.ByteArrayOutputStream()))
            .isInstanceOf(IllegalArgumentException.class);
        verify(minioClient, never()).getObject(any());
    }
}
