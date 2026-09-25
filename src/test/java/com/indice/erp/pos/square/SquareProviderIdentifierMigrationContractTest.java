package com.indice.erp.pos.square;

import java.nio.file.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SquareProviderIdentifierMigrationContractTest {
    @Test void schemaFitsDocumentedPaymentAndRefundIdentifiers() throws Exception {
        var sql=Files.readString(Path.of(
            "src/main/resources/db/migration/V284__square_provider_identifier_capacity.sql"));
        assertThat(sql).contains(
            "square_device_id VARCHAR(255)",
            "square_checkout_id VARCHAR(255)",
            "square_payment_id VARCHAR(192)",
            "object_id VARCHAR(255)",
            "provider_refund_id VARCHAR(255)",
            "payment_id VARCHAR(192)",
            "provider_payment_id VARCHAR(192)",
            "COLLATE utf8mb4_bin");
    }
}
