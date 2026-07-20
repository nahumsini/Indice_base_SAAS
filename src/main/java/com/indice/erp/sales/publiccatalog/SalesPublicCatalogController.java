package com.indice.erp.sales.publiccatalog;

import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.ReviewRequest;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.SaveRequest;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.StatusRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sales/public-catalogs")
public class SalesPublicCatalogController {

    private final SalesPublicCatalogRequestGuard guard;
    private final SalesPublicCatalogService service;

    public SalesPublicCatalogController(
            SalesPublicCatalogRequestGuard guard,
            SalesPublicCatalogService service) {
        this.guard = guard;
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.read(session);
        return access.denied() ? access.error()
            : ResponseEntity.ok(service.list(access.context()));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody SaveRequest request) {
        var access = guard.write(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.status(HttpStatus.CREATED)
            .body(service.create(access.context(), request));
    }

    @PutMapping("/{catalogId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long catalogId,
            @Valid @RequestBody SaveRequest request) {
        var access = guard.write(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(
            service.update(access.context(), catalogId, request));
    }

    @PostMapping("/{catalogId}/status")
    public ResponseEntity<?> status(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long catalogId,
            @Valid @RequestBody StatusRequest request) {
        var access = guard.write(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(
            service.transition(access.context(), catalogId, request));
    }

    @PostMapping("/{catalogId}/rotate-link")
    public ResponseEntity<?> rotate(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long catalogId) {
        var access = guard.write(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(
            service.rotate(access.context(), catalogId));
    }

    @PostMapping("/{catalogId}/link")
    public ResponseEntity<?> revealLink(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long catalogId) {
        var access = guard.write(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(
            service.revealLink(access.context(), catalogId));
    }

    @DeleteMapping("/{catalogId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long catalogId,
            @RequestBody(required = false) StatusRequest request) {
        var access = guard.write(session, csrfToken);
        if (access.denied()) return access.error();
        service.delete(access.context(), catalogId,
            request == null ? null : request.reason());
        return ResponseEntity.ok(java.util.Map.of("deleted", true));
    }

    @GetMapping("/requests")
    public ResponseEntity<?> requests(
            HttpSession session,
            @RequestParam(required = false) String status) {
        var access = guard.read(session);
        return access.denied() ? access.error()
            : ResponseEntity.ok(service.requests(access.context(), status));
    }

    @PostMapping("/requests/{requestId}/review")
    public ResponseEntity<?> review(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long requestId,
            @Valid @RequestBody ReviewRequest request) {
        var access = guard.write(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(
            service.review(access.context(), requestId, request));
    }
}
