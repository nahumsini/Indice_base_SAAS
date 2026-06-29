package com.indice.erp.pos.purchaseorder;

import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.ProductSupplierRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderActionRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderCreateRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderReceiveRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessPinRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessStatusRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalDocumentUploadRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalInvoiceRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalLoginRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalSubmissionRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceDocumentUploadRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceReviewRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionConvertRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionCreateRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionReviewRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.time.LocalDate;
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

    private final PosRequestGuard guard;
    private final PurchaseOrderService service;

    public PurchaseOrderController(PosRequestGuard guard, PurchaseOrderService service) {
        this.guard = guard;
        this.service = service;
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
        var access = guard.requireReadAccess(session);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.listSupplierPortalAccess(access.context()));
    }

    @PostMapping("/supplier-portal-access")
    public ResponseEntity<?> createSupplierPortalAccess(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody SupplierPortalAccessRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.status(HttpStatus.CREATED).body(service.createSupplierPortalAccess(access.context(), request));
    }

    @PostMapping("/supplier-portal-access/{accessId}/status")
    public ResponseEntity<?> updateSupplierPortalAccessStatus(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long accessId,
            @Valid @RequestBody SupplierPortalAccessStatusRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.updateSupplierPortalAccessStatus(access.context(), accessId, request));
    }

    @PostMapping("/supplier-portal-access/{accessId}/pin")
    public ResponseEntity<?> changeSupplierPortalAccessPin(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long accessId,
            @Valid @RequestBody SupplierPortalAccessPinRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.changeSupplierPortalAccessPin(access.context(), accessId, request));
    }

    @PostMapping("/public/supplier-portal/{portalCode}/authenticate")
    public ResponseEntity<?> authenticateSupplierPortal(
            @PathVariable String portalCode,
            @Valid @RequestBody SupplierPortalLoginRequest request) {
        return ResponseEntity.ok(service.authenticateSupplierPortal(portalCode, request));
    }

    @PostMapping("/public/supplier-portal/{portalCode}/submissions")
    public ResponseEntity<?> createPublicSupplierSubmission(
            @PathVariable String portalCode,
            @Valid @RequestBody SupplierPortalSubmissionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
            service.createPublicSupplierSubmission(portalCode, request)
        );
    }

    @PostMapping("/public/supplier-portal/{portalCode}/invoices/presign-upload")
    public ResponseEntity<?> createPublicSupplierInvoiceUpload(
            @PathVariable String portalCode,
            @Valid @RequestBody SupplierPortalDocumentUploadRequest request) {
        return ResponseEntity.ok(service.createPublicSupplierInvoiceUpload(portalCode, request));
    }

    @PostMapping("/public/supplier-portal/{portalCode}/invoices")
    public ResponseEntity<?> createPublicSupplierInvoice(
            @PathVariable String portalCode,
            @Valid @RequestBody SupplierPortalInvoiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
            service.createPublicSupplierInvoice(portalCode, request)
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
}
