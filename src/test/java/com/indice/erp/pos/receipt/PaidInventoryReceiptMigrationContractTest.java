package com.indice.erp.pos.receipt;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class PaidInventoryReceiptMigrationContractTest {
    @Test
    void migrationsPreserveIdempotentFinancialAndTaxTraceability() throws Exception {
        var base = Files.readString(Path.of(
            "src/main/resources/db/migration/V254__pos_paid_inventory_receipts.sql"));
        var hardening = Files.readString(Path.of(
            "src/main/resources/db/migration/V255__harden_pos_paid_inventory_receipts.sql"));
        var partiesAndTaxes = Files.readString(Path.of(
            "src/main/resources/db/migration/V256__pos_inventory_receipt_parties_and_taxes.sql"));

        assertThat(base).contains(
            "cash_movement_id bigint",
            "treasury_movement_id bigint",
            "inventory_movement_id bigint");
        assertThat(hardening).contains(
            "idempotency_key varchar(100)",
            "uk_pos_inventory_receipts_company_idempotency");
        assertThat(partiesAndTaxes).contains(
            "provider_id bigint",
            "request_fingerprint char(64)",
            "subtotal_amount decimal(15,2)",
            "tax_amount decimal(15,2)",
            "entered_unit_cost decimal(15,4)",
            "inventory_unit_cost decimal(15,4)",
            "tax_rate decimal(9,6)",
            "tax_included tinyint(1)",
            "fk_pos_inventory_receipts_provider");
    }
}
