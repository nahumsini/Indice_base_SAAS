package com.indice.erp.messaging;

import com.indice.erp.storage.MinioObjectStorageService;
import com.indice.erp.storage.ObjectStorageProperties;
import io.minio.MinioClient;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.http.ContentDisposition;
import static org.assertj.core.api.Assertions.*;

class MessagingDownloadNameTest {
    private MinioObjectStorageService storage() {
        var properties=new ObjectStorageProperties();
        properties.getMinio().setPublicEndpoint("https://files.example.invalid/private");
        var client=MinioClient.builder().endpoint("https://storage.example.invalid")
            .credentials("synthetic-access","synthetic-secret").region("us-east-1").build();
        return new MinioObjectStorageService(client,properties);
    }
    @Test void namesSurviveSignedUrlRewritingWithoutChangingPrivacyOrExpiry() {
        for(var name:java.util.List.of("reporte del turno.pdf","lista ñ.xlsx","acuerdos \"final\".docx")) {
            var uri=URI.create(storage().presignDownload("private-documents","messaging/private/id",60,name));
            var query=Arrays.stream(uri.getRawQuery().split("&")).map(part->part.split("=",2))
                .collect(Collectors.toMap(part->part[0],part->URLDecoder.decode(part[1],StandardCharsets.UTF_8)));
            assertThat(uri.getHost()).isEqualTo("files.example.invalid");
            assertThat(query.get("X-Amz-Expires")).isEqualTo("60");
            assertThat(query).containsKey("X-Amz-Signature");
            var header=query.get("response-content-disposition");
            assertThat(ContentDisposition.parse(header).getFilename()).isEqualTo(name);
            assertThat(header).startsWith("inline;").doesNotContain("\r","\n");
        }
    }
    @Test void previousDownloadContractIsUnchanged() {
        var uri=URI.create(storage().presignDownload("private-documents","existing/id",60));
        assertThat(uri.getRawQuery()).doesNotContain("response-content-disposition");
    }
}
