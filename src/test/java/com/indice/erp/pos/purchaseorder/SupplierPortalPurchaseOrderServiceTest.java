package com.indice.erp.pos.purchaseorder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalInvoiceRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalSubmissionRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionItemRequest;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@ExtendWith(MockitoExtension.class)
class SupplierPortalPurchaseOrderServiceTest {

    @Mock PurchaseOrderRepository repository;
    @Mock BCryptPasswordEncoder passwordEncoder;
    @Mock ObjectStorageService objectStorageService;
    @Mock ObjectStorageProperties storageProperties;
    @Mock ExpenseService expenseService;

    @Test
    void creationPreservesFutureExpirationAndUsesOpaqueTokenWithoutIdentityPrefix() {
        var expiresAt = Instant.now().plusSeconds(7200);
        var request = new SupplierPortalAccessRequest(80L, "PORTAL-ABC", "4821", "ACTIVE", expiresAt);
        when(repository.findProvider(context(), 80L)).thenReturn(Optional.of(provider()));
        when(passwordEncoder.encode("4821")).thenReturn("hash");
        when(repository.insertSupplierPortalAccess(eq(context()), any(), any(), eq("hash")))
            .thenReturn(18L);
        when(repository.findSupplierPortalAccess(context(), 18L)).thenReturn(Optional.of(
            new SupplierPortalAccessResponse(
                18L, 80L, "Proveedor Norte", "p@example.com", "PORTAL-ABC",
                "/supplier-portal/PORTAL-ABC", "ACTIVE", expiresAt,
                Instant.now(), Instant.now(), false)));

        service().createSupplierPortalAccess(context(), request);

        var captor = ArgumentCaptor.forClass(SupplierPortalAccessRequest.class);
        var codeCaptor = ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(repository).insertSupplierPortalAccess(
            eq(context()), captor.capture(), codeCaptor.capture(), eq("hash"));
        assertThat(captor.getValue().expiresAt()).isEqualTo(expiresAt);
        assertThat(codeCaptor.getValue())
            .matches("[A-F0-9]{48}")
            .hasSize(48)
            .doesNotContain("PORTAL", "SUP-", "7-80", "80-7");
        assertThat(captor.getValue().portalCode()).isEqualTo(codeCaptor.getValue());
    }

    @Test
    void creationRejectsAlreadyExpiredValidity() {
        var request = new SupplierPortalAccessRequest(
            80L, "PORTAL-ABC", "4821", "ACTIVE", Instant.now().minusSeconds(1));
        when(repository.findProvider(context(), 80L)).thenReturn(Optional.of(provider()));

        assertThatThrownBy(() -> service().createSupplierPortalAccess(context(), request))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Supplier portal expiration must be in the future.");
    }

    @Test
    void rollbackModeAlsoCreatesHighEntropyLinkWithoutProviderOrCompanyIdentifiers() {
        var request = new SupplierPortalAccessRequest(
            80L, "PROV-80-REQUESTED", "4821", "ACTIVE", null);
        when(repository.findProvider(context(), 80L)).thenReturn(Optional.of(provider()));
        when(passwordEncoder.encode("4821")).thenReturn("hash");
        when(repository.insertSupplierPortalAccess(eq(context()), any(), any(), eq("hash")))
            .thenReturn(18L);
        when(repository.findSupplierPortalAccess(context(), 18L)).thenReturn(Optional.of(
            new SupplierPortalAccessResponse(
                18L, 80L, "Proveedor Norte", "p@example.com", "opaque",
                "/supplier-portal/opaque", "ACTIVE", null,
                Instant.now(), Instant.now(), false)));

        service().createSupplierPortalAccessLegacy(context(), request);

        var code = ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(repository).insertSupplierPortalAccess(
            eq(context()), any(), code.capture(), eq("hash"));
        assertThat(code.getValue())
            .matches("[A-F0-9]{48}")
            .doesNotContain("PROV-80", "COMPANY-7", "7-80", "80-7", "REQUESTED");
    }

    @Test
    void canonicalSubmissionCannotEscalateToAProductOutsideSupplierCatalog() {
        var item = new SupplierSubmissionItemRequest(
            999L, "SKU-X", "Producto ajeno", null, null,
            BigDecimal.ONE, BigDecimal.TEN, BigDecimal.ZERO, null, BigDecimal.ONE);
        var request = new SupplierPortalSubmissionRequest(
            null, "MXN", null, null, null, List.of(item));
        when(repository.supplierPortalProductAllowed(7L, 80L, 999L)).thenReturn(false);

        assertThatThrownBy(() -> service().createPublicSupplierSubmission(access(), request))
            .isInstanceOf(PosApiException.class)
            .hasMessage("productId is not available for this supplier portal.");
    }

    @Test
    void publicInvoiceRejectsArbitraryExternalDocumentUrls() {
        var request = new SupplierPortalInvoiceRequest(
            null, "INV-2026-1", LocalDate.now(), LocalDate.now().plusDays(30),
            new BigDecimal("100"), new BigDecimal("16"), new BigDecimal("116"),
            "MXN", null, "https://attacker.example/invoice.pdf", "Proveedor");

        assertThatThrownBy(() -> service().createPublicSupplierInvoice(access(), request))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Supplier invoice document reference is invalid for this portal.");
    }

    private PurchaseOrderService service() {
        return new PurchaseOrderService(
            repository, passwordEncoder, objectStorageService, storageProperties,
            expenseService, new ObjectMapper());
    }

    private PosContext context() {
        return new PosContext(10L, 7L, "Buyer", "admin", true, PosScope.corporateOffice());
    }

    private PurchaseOrderRepository.ProviderRef provider() {
        return new PurchaseOrderRepository.ProviderRef(80L, "Proveedor Norte", "p@example.com", 30);
    }

    private PurchaseOrderRepository.SupplierPortalAccessRecord access() {
        return new PurchaseOrderRepository.SupplierPortalAccessRecord(
            18L, 7L, "Indice", 80L, "Proveedor Norte", "p@example.com", "PORTAL-ABC",
            "legacy-hash", "ACTIVE", Instant.now().plusSeconds(3600),
            "[]", 3L, "Unidad Norte", 4L, "Negocio Norte");
    }
}
