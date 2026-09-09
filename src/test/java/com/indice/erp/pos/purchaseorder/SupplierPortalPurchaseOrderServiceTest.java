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
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalLoginRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalSubmissionRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionItemRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionResponse;
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
    @Mock com.indice.erp.kiosk.engine.KioskIdentityCredentialService kioskCredentials;

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
    void providerCenterSubmissionCanUseAnActiveProductFromTheCompanyCatalog() {
        var item = new SupplierSubmissionItemRequest(
            999L, "PROV-SKU", "Producto compartido", null, null,
            BigDecimal.ONE, BigDecimal.TEN, BigDecimal.ZERO, null, BigDecimal.ONE);
        var request = new SupplierPortalSubmissionRequest(
            null, "MXN", "Ana", "ana@proveedor.mx", null, List.of(item));
        var providerContext = providerContext();
        var expected = new SupplierSubmissionResponse(
            123L, 7L, 80L, "Proveedor Norte", "p@example.com", null,
            "SUP-2026-0001", SupplierSubmissionStatus.SUBMITTED, "MXN",
            BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.TEN,
            "Ana", "ana@proveedor.mx", Instant.now(), null, null, null,
            null, null, Instant.now(), List.of());
        when(repository.supplierCompanyProductAllowed(7L, 999L)).thenReturn(true);
        when(repository.findProvider(providerContext, 80L)).thenReturn(Optional.of(provider()));
        when(repository.findProduct(providerContext, 999L)).thenReturn(Optional.of(
            new PurchaseOrderRepository.ProductRef(999L, "CAT-SKU", "Producto compartido", BigDecimal.TEN, "MXN")));
        when(repository.nextSubmissionNumber(providerContext)).thenReturn("SUP-2026-0001");
        when(repository.insertSupplierSubmission(
            eq(providerContext), any(), any(), eq("SUP-2026-0001"),
            any(), any(), any(), any())).thenReturn(123L);
        when(repository.findSupplierSubmission(providerContext, 123L)).thenReturn(Optional.of(expected));

        var result = service().createProviderCenterSupplierSubmission(providerCenterAccess(), request);

        assertThat(result).isEqualTo(expected);
        org.mockito.Mockito.verify(repository).supplierCompanyProductAllowed(7L, 999L);
        org.mockito.Mockito.verify(repository, org.mockito.Mockito.never())
            .supplierPortalProductAllowed(7L, 80L, 999L);
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

    @Test
    void legacyPortalStillAcceptsItsOwnPinBeforeCentralProviderCenterActivation() {
        when(repository.findSupplierPortalAccessByCode("PORTAL-ABC"))
            .thenReturn(Optional.of(access()));
        when(kioskCredentials.pinCredential(7L, "PROVIDER", 80L)).thenReturn(Optional.of(
            new com.indice.erp.kiosk.engine.KioskIdentityCredentialService.PersonalPinCredential(
                "migrated-hash", "ACTIVE", "LEGACY_MIGRATION")));
        when(passwordEncoder.matches("legacy-pin", "legacy-hash")).thenReturn(true);

        var result = service().authenticateSupplierPortal(
            "PORTAL-ABC", new SupplierPortalLoginRequest("legacy-pin"));

        assertThat(result.providerId()).isEqualTo(80L);
    }

    @Test
    void centralProviderPinSupersedesTheOldPinOnLegacyLinks() {
        when(repository.findSupplierPortalAccessByCode("PORTAL-ABC"))
            .thenReturn(Optional.of(access()));
        when(kioskCredentials.pinCredential(7L, "PROVIDER", 80L)).thenReturn(Optional.of(
            new com.indice.erp.kiosk.engine.KioskIdentityCredentialService.PersonalPinCredential(
                "central-hash", "ACTIVE",
                com.indice.erp.kiosk.engine.KioskIdentityCredentialService.PROVIDER_CENTER_ORIGIN)));
        when(passwordEncoder.matches("old-pin", "legacy-hash")).thenReturn(true);
        when(passwordEncoder.matches("old-pin", "central-hash")).thenReturn(false);

        assertThatThrownBy(() -> service().authenticateSupplierPortal(
            "PORTAL-ABC", new SupplierPortalLoginRequest("old-pin")))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Supplier portal PIN is invalid.");
    }

    private PurchaseOrderService service() {
        return new PurchaseOrderService(
            repository, passwordEncoder, objectStorageService, storageProperties,
            expenseService, new ObjectMapper(),
            org.mockito.Mockito.mock(com.indice.erp.billing.storage.CompanyStorageMeter.class),
            kioskCredentials);
    }

    private PosContext context() {
        return new PosContext(10L, 7L, "Buyer", "admin", true, PosScope.corporateOffice());
    }

    private PosContext providerContext() {
        return new PosContext(
            0L, 7L, "Proveedor Norte", "supplier_portal", true,
            PosScope.businessOffice(3L, 4L));
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

    private PurchaseOrderRepository.SupplierPortalAccessRecord providerCenterAccess() {
        return new PurchaseOrderRepository.SupplierPortalAccessRecord(
            null, 7L, "Indice", 80L, "Proveedor Norte", "p@example.com", "provider-center",
            "central-hash", "ACTIVE", null,
            null, 3L, "Unidad Norte", 4L, "Negocio Norte");
    }
}
