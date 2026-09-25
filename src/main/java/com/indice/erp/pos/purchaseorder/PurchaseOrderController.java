package com.indice.erp.pos.purchaseorder;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.finance.providers.ProviderCenterReviewService;
import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.ProductSupplierRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderActionRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderCreateRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderReceiveRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessPinRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessStatusRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalDocumentUploadRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalDocumentRegisterRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalInvoiceRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalLoginRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalSubmissionRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceDocumentUploadRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceReviewRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionConvertRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionCreateRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionReviewRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierQuoteRequestCreateRequest;
import com.indice.erp.pos.purchaseorder.kiosk.ProcurementSupplierPortalAdminService;
import com.indice.erp.pos.purchaseorder.kiosk.ProcurementSupplierPortalCapabilities;
import com.indice.erp.pos.purchaseorder.kiosk.ProcurementSupplierPortalPublicGateway;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos")
public class PurchaseOrderController {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private final PosRequestGuard guard;
    private final PurchaseOrderService service;
    private final ProcurementSupplierPortalAdminService supplierPortalAdmin;
    private final ProcurementSupplierPortalPublicGateway supplierPortalPublic;
    private final ObjectMapper objectMapper;
    private final KioskEngineFeatureFlags kioskFlags;
    private final SupplierQuoteRequestService quoteRequests;
    private final ProviderCenterReviewService providerCenterReview;

    public PurchaseOrderController(
            PosRequestGuard guard,
            PurchaseOrderService service,
            ProcurementSupplierPortalAdminService supplierPortalAdmin,
            ProcurementSupplierPortalPublicGateway supplierPortalPublic,
            ObjectMapper objectMapper,
            KioskEngineFeatureFlags kioskFlags,
            SupplierQuoteRequestService quoteRequests,
            ProviderCenterReviewService providerCenterReview) {
        this.guard = guard;
        this.service = service;
        this.supplierPortalAdmin = supplierPortalAdmin;
        this.supplierPortalPublic = supplierPortalPublic;
        this.objectMapper = objectMapper;
        this.kioskFlags = kioskFlags;
        this.quoteRequests = quoteRequests;
        this.providerCenterReview = providerCenterReview;
    }

    @GetMapping("/supplier-profile-changes")
    public ResponseEntity<?> listSupplierProfileChanges(HttpSession session) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error()
            : ResponseEntity.ok(providerCenterReview.commercialInbox(access.context()));
    }

    @PostMapping("/supplier-registration-requests/{requestId}/approve")
    public ResponseEntity<?> approveSupplierRegistration(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long requestId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error()
            : ResponseEntity.ok(providerCenterReview.approveRegistration(
                access.context(), requestId, requiredLong(payload, "unit_id"),
                requiredLong(payload, "business_id"), text(payload, "review_note")));
    }

    @PostMapping("/supplier-registration-requests/{requestId}/reject")
    public ResponseEntity<?> rejectSupplierRegistration(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long requestId,
            @RequestBody(required = false) Map<String, Object> payload) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error()
            : ResponseEntity.ok(providerCenterReview.rejectRegistration(
                access.context(), requestId, text(payload, "review_note")));
    }

    @PostMapping("/supplier-profile-changes/{requestId}/{action:approve|reject}")
    public ResponseEntity<?> reviewSupplierProfileChange(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long requestId,
            @PathVariable String action,
            @RequestBody(required = false) Map<String, Object> payload) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error()
            : ResponseEntity.ok(providerCenterReview.reviewCommercialChange(
                access.context(), requestId, "approve".equals(action),
                payload == null ? "" : String.valueOf(payload.getOrDefault("review_note", ""))));
    }

    @GetMapping("/supplier-quote-requests")
    public ResponseEntity<?> listSupplierQuoteRequests(HttpSession session) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(quoteRequests.list(access.context()));
    }

    @GetMapping("/supplier-quote-requests/{requestId}")
    public ResponseEntity<?> getSupplierQuoteRequest(
            HttpSession session, @PathVariable long requestId) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error()
            : ResponseEntity.ok(quoteRequests.detail(access.context(), requestId));
    }

    @PostMapping("/supplier-quote-requests")
    public ResponseEntity<?> createSupplierQuoteRequest(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody SupplierQuoteRequestCreateRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error()
            : ResponseEntity.status(HttpStatus.CREATED).body(quoteRequests.create(access.context(), request));
    }

    @PostMapping("/supplier-quote-requests/{requestId}/{action:open|close|cancel}")
    public ResponseEntity<?> transitionSupplierQuoteRequest(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long requestId,
            @PathVariable String action) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error()
            : ResponseEntity.ok(quoteRequests.transition(access.context(), requestId, action));
    }

    @GetMapping("/product-suppliers")
    public ResponseEntity<?> listProductSuppliers(HttpSession session) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.listProductSuppliers(access.context()));
    }

    @PostMapping("/product-suppliers")
    public ResponseEntity<?> upsertProductSupplier(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody ProductSupplierRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.status(HttpStatus.CREATED).body(service.upsertProductSupplier(access.context(), request));
    }

    @PutMapping("/product-suppliers/{supplierLinkId}")
    public ResponseEntity<?> updateProductSupplier(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long supplierLinkId,
            @Valid @RequestBody ProductSupplierRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.updateProductSupplier(access.context(), supplierLinkId, request));
    }

    @GetMapping("/purchase-orders")
    public ResponseEntity<?> listPurchaseOrders(
            HttpSession session,
            @RequestParam(required = false) PurchaseOrderStatus status,
            @RequestParam(required = false) PurchaseOrderOrigin origin,
            @RequestParam(required = false) Long providerId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        var access = guard.requireReadAccess(session);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.listOrders(access.context(), status, origin, providerId, warehouseId, dateFrom, dateTo));
    }

    @GetMapping("/purchase-orders/{orderId}")
    public ResponseEntity<?> getPurchaseOrder(HttpSession session, @PathVariable long orderId) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.getOrder(access.context(), orderId));
    }

    @PostMapping("/purchase-orders")
    public ResponseEntity<?> createPurchaseOrder(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody PurchaseOrderCreateRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.status(HttpStatus.CREATED).body(service.createOrder(access.context(), request));
    }

    @PostMapping("/purchase-orders/{orderId}/request")
    public ResponseEntity<?> requestPurchaseOrder(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long orderId,
            @RequestBody(required = false) PurchaseOrderActionRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.requestOrder(access.context(), orderId, emptyAction(request)));
    }

    @PostMapping("/purchase-orders/{orderId}/approve")
    public ResponseEntity<?> approvePurchaseOrder(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long orderId,
            @RequestBody(required = false) PurchaseOrderActionRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.approveOrder(access.context(), orderId, emptyAction(request)));
    }

    @PostMapping("/purchase-orders/{orderId}/send")
    public ResponseEntity<?> sendPurchaseOrder(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long orderId,
            @RequestBody(required = false) PurchaseOrderActionRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.sendOrder(access.context(), orderId, emptyAction(request)));
    }

    @PostMapping("/purchase-orders/{orderId}/cancel")
    public ResponseEntity<?> cancelPurchaseOrder(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long orderId,
            @RequestBody(required = false) PurchaseOrderActionRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.cancelOrder(access.context(), orderId, emptyAction(request)));
    }

    @PostMapping("/purchase-orders/{orderId}/receive")
    public ResponseEntity<?> receivePurchaseOrder(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long orderId,
            @Valid @RequestBody PurchaseOrderReceiveRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.receiveOrder(access.context(), orderId, request));
    }

    @GetMapping("/supplier-submissions")
    public ResponseEntity<?> listSupplierSubmissions(
            HttpSession session,
            @RequestParam(required = false) SupplierSubmissionStatus status,
            @RequestParam(required = false) Long providerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        var access = guard.requireReadAccess(session);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.listSupplierSubmissions(access.context(), status, providerId, dateFrom, dateTo));
    }

    @GetMapping("/supplier-submissions/{submissionId}")
    public ResponseEntity<?> getSupplierSubmission(HttpSession session, @PathVariable long submissionId) {
        var access = guard.requireReadAccess(session);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.getSupplierSubmission(access.context(), submissionId));
    }

    @PostMapping("/supplier-submissions")
    public ResponseEntity<?> createSupplierSubmission(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody SupplierSubmissionCreateRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.status(HttpStatus.CREATED).body(service.createSupplierSubmission(access.context(), request));
    }

    @GetMapping("/supplier-portal-access")
    public ResponseEntity<?> listSupplierPortalAccess(HttpSession session) {
        var access = supplierPortalEngineEnabled()
            ? guard.requireAdminReadAccess(session) : guard.requireReadAccess(session);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(supplierPortalAdmin.list(access.context()));
    }

    @PostMapping("/supplier-portal-access")
    public ResponseEntity<?> createSupplierPortalAccess(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody SupplierPortalAccessRequest request) {
        var access = supplierPortalEngineEnabled()
            ? guard.requireAdminWriteAccess(session, csrfToken)
            : guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.status(HttpStatus.CREATED).body(supplierPortalAdmin.create(access.context(), request));
    }

    @PostMapping("/supplier-portal-access/{accessId}/status")
    public ResponseEntity<?> updateSupplierPortalAccessStatus(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long accessId,
            @Valid @RequestBody SupplierPortalAccessStatusRequest request) {
        var access = supplierPortalEngineEnabled()
            ? guard.requireAdminWriteAccess(session, csrfToken)
            : guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(supplierPortalAdmin.transition(access.context(), accessId, request, null));
    }

    @PostMapping("/supplier-portal-access/{accessId}/pin")
    public ResponseEntity<?> changeSupplierPortalAccessPin(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long accessId,
            @Valid @RequestBody SupplierPortalAccessPinRequest request) {
        var access = supplierPortalEngineEnabled()
            ? guard.requireAdminWriteAccess(session, csrfToken)
            : guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(supplierPortalAdmin.rotatePin(access.context(), accessId, request));
    }

    @PostMapping("/supplier-portal-access/{accessId}/link")
    public ResponseEntity<?> resetSupplierPortalAccessLink(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long accessId) {
        var access = supplierPortalEngineEnabled()
            ? guard.requireAdminWriteAccess(session, csrfToken)
            : guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(supplierPortalAdmin.resetLink(access.context(), accessId));
    }

    @DeleteMapping("/supplier-portal-access/{accessId}")
    public ResponseEntity<?> deleteSupplierPortalAccess(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long accessId,
            @RequestBody(required = false) Map<String, Object> payload) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        var reason = payload == null ? null : String.valueOf(payload.getOrDefault("reason", ""));
        supplierPortalAdmin.delete(access.context(), accessId, reason);
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    @GetMapping("/public/supplier-portal/{portalCode}/bootstrap")
    public ResponseEntity<?> bootstrapSupplierPortal(
            @PathVariable String portalCode,
            HttpServletRequest request,
            HttpSession session) {
        return ResponseEntity.ok(supplierPortalPublic.bootstrap(portalCode, request, session));
    }

    @PostMapping("/public/supplier-portal/{portalCode}/authenticate")
    public ResponseEntity<?> authenticateSupplierPortal(
            @PathVariable String portalCode,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "X-Kiosk-CSRF", required = false) String kioskCsrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody SupplierPortalLoginRequest body,
            HttpServletRequest request,
            HttpSession session) {
        return ResponseEntity.ok(supplierPortalPublic.authenticate(
            portalCode, first(csrfToken, kioskCsrfToken), idempotencyKey,
            body.pin(), request, session));
    }

    @PostMapping("/public/supplier-portal/{portalCode}/submissions")
    public ResponseEntity<?> createPublicSupplierSubmission(
            @PathVariable String portalCode,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "X-Kiosk-CSRF", required = false) String kioskCsrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestHeader(name = "X-Kiosk-Session", required = false) String kioskSessionToken,
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody SupplierPortalSubmissionRequest body,
            HttpServletRequest request,
            HttpSession session) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
            supplierPortalPublic.execute(
                portalCode, first(csrfToken, kioskCsrfToken), idempotencyKey,
                sessionToken(kioskSessionToken, authorization), body.pin(),
                ProcurementSupplierPortalCapabilities.SUBMISSION_CREATE, null,
                map(body), request, session)
        );
    }

    @PostMapping("/public/supplier-portal/{portalCode}/context")
    public ResponseEntity<?> supplierPortalContext(
            @PathVariable String portalCode,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "X-Kiosk-CSRF", required = false) String kioskCsrfToken,
            @RequestHeader(name = "X-Kiosk-Session", required = false) String kioskSessionToken,
            @RequestHeader(name = "Authorization", required = false) String authorization,
            HttpServletRequest request,
            HttpSession session) {
        return ResponseEntity.ok(supplierPortalPublic.execute(
            portalCode, first(csrfToken, kioskCsrfToken), null,
            sessionToken(kioskSessionToken, authorization), null,
            ProcurementSupplierPortalCapabilities.CATALOG_READ, null,
            Map.of(), request, session));
    }

    @PostMapping("/public/supplier-portal/{portalCode}/logout")
    public ResponseEntity<?> logoutSupplierPortal(
            @PathVariable String portalCode,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "X-Kiosk-CSRF", required = false) String kioskCsrfToken,
            @RequestHeader(name = "X-Kiosk-Session", required = false) String kioskSessionToken,
            @RequestHeader(name = "Authorization", required = false) String authorization,
            HttpServletRequest request,
            HttpSession session) {
        return ResponseEntity.ok(supplierPortalPublic.closeSession(
            portalCode, first(csrfToken, kioskCsrfToken),
            sessionToken(kioskSessionToken, authorization), request, session));
    }

    @PostMapping("/public/supplier-portal/{portalCode}/invoices/presign-upload")
    public ResponseEntity<?> createPublicSupplierInvoiceUpload(
            @PathVariable String portalCode,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "X-Kiosk-CSRF", required = false) String kioskCsrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestHeader(name = "X-Kiosk-Session", required = false) String kioskSessionToken,
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody SupplierPortalDocumentUploadRequest body,
            HttpServletRequest request,
            HttpSession session) {
        return ResponseEntity.ok(supplierPortalPublic.execute(
            portalCode, first(csrfToken, kioskCsrfToken), idempotencyKey,
            sessionToken(kioskSessionToken, authorization), body.pin(),
            ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN,
            supplierPortalPublic.legacyReference(portalCode), map(body), request, session));
    }

    @PostMapping("/public/supplier-portal/{portalCode}/invoices/register-upload")
    public ResponseEntity<?> registerPublicSupplierInvoiceUpload(
            @PathVariable String portalCode,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "X-Kiosk-CSRF", required = false) String kioskCsrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestHeader(name = "X-Kiosk-Session", required = false) String kioskSessionToken,
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody SupplierPortalDocumentRegisterRequest body,
            HttpServletRequest request,
            HttpSession session) {
        return ResponseEntity.ok(supplierPortalPublic.execute(
            portalCode, first(csrfToken, kioskCsrfToken), idempotencyKey,
            sessionToken(kioskSessionToken, authorization), null,
            ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_REGISTER,
            supplierPortalPublic.legacyReference(portalCode), map(body), request, session));
    }

    @PostMapping("/public/supplier-portal/{portalCode}/invoices")
    public ResponseEntity<?> createPublicSupplierInvoice(
            @PathVariable String portalCode,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "X-Kiosk-CSRF", required = false) String kioskCsrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestHeader(name = "X-Kiosk-Session", required = false) String kioskSessionToken,
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody SupplierPortalInvoiceRequest body,
            HttpServletRequest request,
            HttpSession session) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
            supplierPortalPublic.execute(
                portalCode, first(csrfToken, kioskCsrfToken), idempotencyKey,
                sessionToken(kioskSessionToken, authorization), body.pin(),
                ProcurementSupplierPortalCapabilities.INVOICE_SUBMIT, null,
                map(body), request, session)
        );
    }

    @PostMapping("/supplier-submissions/{submissionId}/review")
    public ResponseEntity<?> reviewSupplierSubmission(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long submissionId,
            @Valid @RequestBody SupplierSubmissionReviewRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.reviewSupplierSubmission(access.context(), submissionId, request));
    }

    @PostMapping("/supplier-submissions/{submissionId}/convert-to-purchase-order")
    public ResponseEntity<?> convertSupplierSubmission(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long submissionId,
            @Valid @RequestBody SupplierSubmissionConvertRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.status(HttpStatus.CREATED).body(
                service.convertSupplierSubmission(access.context(), submissionId, request)
            );
    }

    @GetMapping("/supplier-invoices")
    public ResponseEntity<?> listSupplierInvoices(
            HttpSession session,
            @RequestParam(required = false) SupplierInvoiceStatus status,
            @RequestParam(required = false) Long providerId) {
        var access = guard.requireReadAccess(session);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.listSupplierInvoices(access.context(), status, providerId));
    }

    @PostMapping("/supplier-invoices")
    public ResponseEntity<?> submitSupplierInvoice(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody SupplierInvoiceRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.status(HttpStatus.CREATED).body(service.submitSupplierInvoice(access.context(), request));
    }

    @PostMapping("/supplier-invoices/presign-upload")
    public ResponseEntity<?> createSupplierInvoiceUpload(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody SupplierInvoiceDocumentUploadRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.createSupplierInvoiceUpload(access.context(), request));
    }

    @PostMapping("/supplier-invoices/{invoiceId}/review")
    public ResponseEntity<?> reviewSupplierInvoice(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long invoiceId,
            @Valid @RequestBody SupplierInvoiceReviewRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.reviewSupplierInvoice(access.context(), invoiceId, request));
    }

    private PurchaseOrderActionRequest emptyAction(PurchaseOrderActionRequest request) {
        return request == null ? new PurchaseOrderActionRequest(null) : request;
    }

    private long requiredLong(Map<String, Object> payload, String field) {
        try {
            var raw = payload == null ? null : payload.get(field);
            var value = raw instanceof Number number ? number.longValue()
                : Long.parseLong(String.valueOf(raw));
            if (value > 0) return value;
        } catch (RuntimeException ignored) { }
        throw new IllegalArgumentException(field + " is required.");
    }

    private String text(Map<String, Object> payload, String field) {
        var value = payload == null ? null : payload.get(field);
        return value == null ? "" : String.valueOf(value).trim();
    }

    private Map<String, Object> map(Object value) {
        return objectMapper.convertValue(value, MAP_TYPE);
    }

    private String first(String primary, String fallback) {
        return primary != null && !primary.isBlank() ? primary.trim()
            : fallback == null || fallback.isBlank() ? null : fallback.trim();
    }

    private String sessionToken(String kioskSessionToken, String authorization) {
        if (kioskSessionToken != null && !kioskSessionToken.isBlank()) {
            return kioskSessionToken.trim();
        }
        if (authorization != null && authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            var token = authorization.substring(7).trim();
            return token.isBlank() ? null : token;
        }
        return null;
    }

    private boolean supplierPortalEngineEnabled() {
        return kioskFlags.registryEnabled() && kioskFlags.sessionsEnabled() && kioskFlags.auditEnabled()
            && kioskFlags.adapterEnabled(ProcurementSupplierPortalCapabilities.OWNER_MODULE);
    }
}
