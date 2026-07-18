package com.indice.erp.pos.purchaseorder.kiosk;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskActionDispatcher;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskDispatchResult;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskRateLimitService;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskSessionService;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalContextResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalDocumentRegisterRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalSubmissionRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import com.indice.erp.pos.purchaseorder.PurchaseOrderService;
import com.indice.erp.pos.purchaseorder.SupplierSubmissionStatus;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProcurementSupplierPortalPublicGatewayTest {

    @Mock ProcurementSupplierPortalAdapter adapter;
    @Mock KioskActionDispatcher dispatcher;
    @Mock KioskRegistryService registry;
    @Mock KioskRateLimitService rateLimit;
    @Mock KioskSessionService sessions;
    @Mock SessionCsrfService csrf;
    @Mock KioskEngineFeatureFlags flags;
    @Mock PurchaseOrderService purchaseOrders;
    @Mock PurchaseOrderRepository repository;
    @Mock ProcurementSupplierPortalIdentityService identities;
    @Mock HttpServletRequest request;
    @Mock HttpSession browserSession;

    @Test
    void logoutAuthenticatesTheOpaqueTokenBeforeRevokingTheResolvedSession() {
        when(browserSession.getId()).thenReturn("browser-session");
        when(dispatcher.dispatchWithMetadata(any(), any(), eq(null)))
            .thenReturn(new KioskDispatchResult(Map.of(), "session-id", "procurement.catalog.read@1"));
        when(registry.resolvePublic("PROCUREMENT", "PORTAL-ABC")).thenReturn(definition());

        gateway().closeSession(
            "PORTAL-ABC", "csrf", "opaque-token", request, browserSession);

        verify(csrf).requireCsrf(browserSession, "csrf");
        verify(sessions).revoke("session-id", definition());
    }

    @Test
    void publicActionNeverFallsBackToAnonymousWhenPinAndSessionAreMissing() {
        assertThatThrownBy(() -> gateway().execute(
            "PORTAL-ABC", "csrf", "key-1", null, null,
            ProcurementSupplierPortalCapabilities.SUBMISSION_CREATE,
            null, Map.of(), request, browserSession))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Supplier portal authentication is required.");
    }

    @Test
    void csrfFailureStopsTheActionBeforeDispatch() {
        org.mockito.Mockito.doThrow(new IllegalArgumentException("bad csrf"))
            .when(csrf).requireCsrf(browserSession, "bad");

        assertThatThrownBy(() -> gateway().execute(
            "PORTAL-ABC", "bad", "key-1", "opaque", null,
            ProcurementSupplierPortalCapabilities.SUBMISSION_CREATE,
            null, Map.of(), request, browserSession))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Kiosk browser validation failed.");
    }

    @Test
    void featureFlagOffPreservesLegacyFullDtoWithoutCsrfSessionOrIdempotency() {
        var submittedAt = Instant.parse("2026-07-18T12:30:00Z");
        var legacyResponse = new SupplierSubmissionResponse(
            901L, 7L, 80L, "Proveedor Norte", "proveedor@example.com", 18L,
            "SUB-2026-0001", SupplierSubmissionStatus.SUBMITTED, "MXN",
            new BigDecimal("100.00"), new BigDecimal("16.00"), new BigDecimal("116.00"),
            "Ana", "ana@example.com", submittedAt, null, null, null, null,
            "Entrega urgente", submittedAt, List.of());
        when(purchaseOrders.createPublicSupplierSubmission(
            eq("PORTAL-ABC"), any(SupplierPortalSubmissionRequest.class)))
            .thenReturn(legacyResponse);

        var result = legacyGateway().execute(
            "portal-abc", null, null, null, "4821",
            ProcurementSupplierPortalCapabilities.SUBMISSION_CREATE,
            null, Map.of(
                "currencyCode", "MXN",
                "items", List.of(Map.of(
                    "productId", 44L,
                    "productName", "Insumo",
                    "quantity", 1,
                    "unitCost", 100,
                    "taxRate", 16))),
            request, browserSession);

        assertThat(((Number) result.get("id")).longValue()).isEqualTo(901L);
        assertThat(((Number) result.get("companyId")).longValue()).isEqualTo(7L);
        assertThat(((Number) result.get("providerId")).longValue()).isEqualTo(80L);
        assertThat(((Number) result.get("portalAccessId")).longValue()).isEqualTo(18L);
        assertThat(result)
            .containsEntry("submissionNumber", "SUB-2026-0001")
            .containsEntry("status", "SUBMITTED")
            .containsEntry("notes", "Entrega urgente");
        verify(purchaseOrders).createPublicSupplierSubmission(
            eq("PORTAL-ABC"), argThat(submission ->
                "4821".equals(submission.pin())
                    && "MXN".equals(submission.currencyCode())
                    && submission.items().size() == 1
                    && submission.items().getFirst().productId() == 44L));
        verifyNoInteractions(csrf, dispatcher, registry, rateLimit, sessions, identities);
    }

    @Test
    void featureFlagOffCsrfAuthenticationCreatesCompatSessionAndSupportsRegister() {
        var access = access();
        var expiresAt = Instant.now().plusSeconds(3600);
        var storedSession = new AtomicReference<Object>();
        doAnswer(invocation -> {
            storedSession.set(invocation.getArgument(1));
            return null;
        }).when(browserSession).setAttribute(anyString(), any());
        when(browserSession.getAttribute(anyString()))
            .thenAnswer(invocation -> storedSession.get());
        when(repository.findSupplierPortalAccessByCode("PORTAL-ABC"))
            .thenReturn(Optional.of(access));
        when(identities.verify(access, "4821")).thenReturn(Map.of(
            "kiosk_session_token", "opaque-compat-token",
            "expires_at", expiresAt.toString()));
        when(purchaseOrders.supplierPortalContext(access)).thenReturn(
            new SupplierPortalContextResponse(
                18L, "PORTAL-ABC", 80L, "Proveedor Norte",
                "proveedor@example.com", "ACTIVE", List.of()));
        when(csrf.ensureCsrf(browserSession)).thenReturn("csrf-next");
        when(purchaseOrders.registerPublicSupplierInvoiceUpload(
            eq(access), any(SupplierPortalDocumentRegisterRequest.class)))
            .thenReturn(Map.of("objectKey", "supplier/sealed/invoice.pdf"));
        var gateway = legacyGateway();

        var authenticated = gateway.authenticate(
            "portal-abc", "csrf-bootstrap", null, "4821", request, browserSession);
        var registered = gateway.execute(
            "portal-abc", "csrf-next", null,
            String.valueOf(authenticated.get("sessionToken")), null,
            ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_REGISTER,
            18L, Map.of(
                "objectKey", "supplier/staging/invoice.pdf",
                "fileName", "invoice.pdf",
                "contentType", "application/pdf",
                "sizeBytes", 1024L),
            request, browserSession);

        assertThat(authenticated)
            .containsEntry("sessionToken", "opaque-compat-token")
            .containsEntry("csrfToken", "csrf-next")
            .containsEntry("legacyMode", true);
        assertThat(storedSession.get()).isNotNull();
        assertThat(registered).containsEntry("objectKey", "supplier/sealed/invoice.pdf");
        verify(csrf).requireCsrf(browserSession, "csrf-bootstrap");
        verify(csrf).requireCsrf(browserSession, "csrf-next");
        verify(purchaseOrders).registerPublicSupplierInvoiceUpload(
            eq(access), argThat(register ->
                "supplier/staging/invoice.pdf".equals(register.objectKey())
                    && "invoice.pdf".equals(register.fileName())
                    && register.sizeBytes() == 1024L));
        verify(purchaseOrders, never()).authenticateSupplierPortal(anyString(), any());
    }

    @Test
    void featureFlagOffCompatSessionRejectsAbsoluteExpiryAndClearsBrowserState() {
        var access = access();
        var storedSession = new AtomicReference<Object>();
        doAnswer(invocation -> {
            storedSession.set(invocation.getArgument(1));
            return null;
        }).when(browserSession).setAttribute(anyString(), any());
        when(browserSession.getAttribute(anyString()))
            .thenAnswer(invocation -> storedSession.get());
        doAnswer(invocation -> {
            storedSession.set(null);
            return null;
        }).when(browserSession).removeAttribute(anyString());
        when(repository.findSupplierPortalAccessByCode("PORTAL-ABC"))
            .thenReturn(Optional.of(access));
        when(identities.verify(access, "4821")).thenReturn(Map.of(
            "kiosk_session_token", "expired-compat-token",
            "expires_at", Instant.now().minusSeconds(1).toString()));
        when(purchaseOrders.supplierPortalContext(access)).thenReturn(
            new SupplierPortalContextResponse(
                18L, "PORTAL-ABC", 80L, "Proveedor Norte",
                "proveedor@example.com", "ACTIVE", List.of()));
        when(csrf.ensureCsrf(browserSession)).thenReturn("csrf-next");
        var gateway = legacyGateway();
        var authenticated = gateway.authenticate(
            "portal-abc", "csrf-bootstrap", null, "4821", request, browserSession);

        assertThatThrownBy(() -> gateway.execute(
            "portal-abc", "csrf-next", null,
            String.valueOf(authenticated.get("sessionToken")), null,
            ProcurementSupplierPortalCapabilities.CATALOG_READ,
            null, Map.of(), request, browserSession))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Supplier portal authentication is required.");
        assertThat(storedSession.get()).isNull();
        verify(browserSession).removeAttribute(anyString());
    }

    private ProcurementSupplierPortalPublicGateway gateway() {
        when(flags.registryEnabled()).thenReturn(true);
        when(flags.sessionsEnabled()).thenReturn(true);
        when(flags.auditEnabled()).thenReturn(true);
        when(flags.adapterEnabled(ProcurementSupplierPortalCapabilities.OWNER_MODULE))
            .thenReturn(true);
        return new ProcurementSupplierPortalPublicGateway(
            adapter, dispatcher, registry, rateLimit, sessions, csrf, flags,
            purchaseOrders, repository, new ObjectMapper().findAndRegisterModules(), identities);
    }

    private ProcurementSupplierPortalPublicGateway legacyGateway() {
        return new ProcurementSupplierPortalPublicGateway(
            adapter, dispatcher, registry, rateLimit, sessions, csrf, flags,
            purchaseOrders, repository, new ObjectMapper().findAndRegisterModules(), identities);
    }

    private KioskResolvedDefinition definition() {
        return new KioskResolvedDefinition(
            100L, 7L, "PROCUREMENT", "supplier_portal", 18L,
            "PORTAL-ABC", "Portal proveedor", KioskDefinitionStatus.ACTIVE,
            3L, 4L, null, KioskAccessLevel.CONTROLLED, null,
            "RTAL-ABC", true, 1, 1
        );
    }

    private PurchaseOrderRepository.SupplierPortalAccessRecord access() {
        return new PurchaseOrderRepository.SupplierPortalAccessRecord(
            18L, 7L, "Indice", 80L, "Proveedor Norte", "proveedor@example.com",
            "PORTAL-ABC", "legacy-hash", "ACTIVE", Instant.now().plusSeconds(7200),
            "[\"procurement.catalog.read\"]", 3L, "Unidad Norte", 4L, "Negocio Norte");
    }
}
