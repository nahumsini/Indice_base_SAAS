package com.indice.erp.sales;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.storage.ObjectStorageDisabledException;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sales")
public class SalesApiController {

    private final SessionAuthService sessionAuthService;
    private final SalesService salesService;

    public SalesApiController(SessionAuthService sessionAuthService, SalesService salesService) {
        this.sessionAuthService = sessionAuthService;
        this.salesService = salesService;
    }

    @GetMapping("/context")
    public ResponseEntity<?> context(HttpSession session) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        return ResponseEntity.ok(salesService.context(user.get().companyId(), user.get().userId()));
    }

    @GetMapping("/kpis")
    public ResponseEntity<?> kpis(HttpSession session) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        return ResponseEntity.ok(salesService.kpis(user.get().companyId()));
    }

    @GetMapping("/files")
    public ResponseEntity<?> listFiles(HttpSession session, @RequestParam Map<String, String> params) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        try {
            return ResponseEntity.ok(salesService.listFiles(
                    user.get().companyId(),
                    firstNonBlank(params.get("entityType"), params.get("entity_type")),
                    nullableLong(firstNonBlank(params.get("entityId"), params.get("entity_id")))));
        } catch (IllegalArgumentException ex) {
            return badRequest(ex);
        }
    }

    @PostMapping("/files")
    public ResponseEntity<?> createFile(
            HttpSession session,
            @RequestBody(required = false) Map<String, Object> payload) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(salesService.createFile(
                    user.get().companyId(),
                    user.get().userId(),
                    payload == null ? Map.<String, Object>of() : payload));
        } catch (NoSuchElementException ex) {
            return notFound(ex);
        } catch (IllegalArgumentException ex) {
            return badRequest(ex);
        }
    }

    @PostMapping("/products/images/presign-upload")
    public ResponseEntity<?> createProductImageUpload(
            HttpSession session,
            @RequestBody(required = false) Map<String, Object> payload) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        try {
            return ResponseEntity.ok(salesService.createProductImageUpload(
                    user.get().companyId(),
                    payload == null ? Map.<String, Object>of() : payload));
        } catch (ObjectStorageDisabledException ex) {
            return storageUnavailable(ex);
        } catch (IllegalArgumentException ex) {
            return badRequest(ex);
        }
    }

    @PostMapping("/products/{productId}/images")
    public ResponseEntity<?> registerProductImage(
            HttpSession session,
            @PathVariable long productId,
            @RequestBody(required = false) Map<String, Object> payload) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(salesService.registerProductImage(
                    user.get().companyId(),
                    user.get().userId(),
                    productId,
                    payload == null ? Map.<String, Object>of() : payload));
        } catch (ObjectStorageDisabledException ex) {
            return storageUnavailable(ex);
        } catch (NoSuchElementException ex) {
            return notFound(ex);
        } catch (IllegalArgumentException ex) {
            return badRequest(ex);
        }
    }

    @DeleteMapping("/files/{fileId}")
    public ResponseEntity<?> deleteFile(HttpSession session, @PathVariable long fileId) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        salesService.deleteFile(user.get().companyId(), fileId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/quotes/{quoteId}/items")
    public ResponseEntity<?> createQuoteItem(
            HttpSession session,
            @PathVariable long quoteId,
            @RequestBody(required = false) Map<String, Object> payload) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(salesService.createQuoteItem(
                    user.get().companyId(),
                    quoteId,
                    payload == null ? Map.<String, Object>of() : payload));
        } catch (NoSuchElementException ex) {
            return notFound(ex);
        } catch (IllegalArgumentException ex) {
            return badRequest(ex);
        }
    }

    @PutMapping("/quotes/{quoteId}/items/{itemId}")
    public ResponseEntity<?> updateQuoteItem(
            HttpSession session,
            @PathVariable long quoteId,
            @PathVariable long itemId,
            @RequestBody(required = false) Map<String, Object> payload) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        try {
            return ResponseEntity.ok(salesService.updateQuoteItem(
                    user.get().companyId(),
                    quoteId,
                    itemId,
                    payload == null ? Map.<String, Object>of() : payload));
        } catch (NoSuchElementException ex) {
            return notFound(ex);
        } catch (IllegalArgumentException ex) {
            return badRequest(ex);
        }
    }

    @DeleteMapping("/quotes/{quoteId}/items/{itemId}")
    public ResponseEntity<?> deleteQuoteItem(
            HttpSession session,
            @PathVariable long quoteId,
            @PathVariable long itemId) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        try {
            return ResponseEntity.ok(salesService.deleteQuoteItem(user.get().companyId(), quoteId, itemId));
        } catch (NoSuchElementException ex) {
            return notFound(ex);
        }
    }

    @PostMapping("/quotes/{quoteId}/connection")
    public ResponseEntity<?> connectQuote(
            HttpSession session,
            @PathVariable long quoteId,
            @RequestBody(required = false) Map<String, Object> payload) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        try {
            return ResponseEntity.ok(salesService.connectQuote(
                    user.get().companyId(),
                    user.get().userId(),
                    quoteId,
                    payload == null ? Map.<String, Object>of() : payload));
        } catch (NoSuchElementException ex) {
            return notFound(ex);
        } catch (IllegalArgumentException ex) {
            return badRequest(ex);
        }
    }

    @GetMapping("/{collection}")
    public ResponseEntity<?> list(
            HttpSession session,
            @PathVariable String collection,
            @RequestParam Map<String, String> filters) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        try {
            return ResponseEntity.ok(salesService.list(user.get().companyId(), collection, filters));
        } catch (NoSuchElementException ex) {
            return notFound(ex);
        }
    }

    @PostMapping("/{collection}")
    public ResponseEntity<?> create(
            HttpSession session,
            @PathVariable String collection,
            @RequestBody(required = false) Map<String, Object> payload) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(salesService.create(
                    user.get().companyId(),
                    user.get().userId(),
                    collection,
                    payload == null ? Map.<String, Object>of() : payload));
        } catch (NoSuchElementException ex) {
            return notFound(ex);
        } catch (IllegalArgumentException ex) {
            return badRequest(ex);
        }
    }

    @GetMapping("/{collection}/{id}")
    public ResponseEntity<?> get(
            HttpSession session,
            @PathVariable String collection,
            @PathVariable long id) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        try {
            return ResponseEntity.ok(salesService.get(user.get().companyId(), collection, id));
        } catch (NoSuchElementException ex) {
            return notFound(ex);
        }
    }

    @PutMapping("/{collection}/{id}")
    public ResponseEntity<?> update(
            HttpSession session,
            @PathVariable String collection,
            @PathVariable long id,
            @RequestBody(required = false) Map<String, Object> payload) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        try {
            return ResponseEntity.ok(salesService.update(
                    user.get().companyId(),
                    user.get().userId(),
                    collection,
                    id,
                    payload == null ? Map.<String, Object>of() : payload));
        } catch (NoSuchElementException ex) {
            return notFound(ex);
        } catch (IllegalArgumentException ex) {
            return badRequest(ex);
        }
    }

    @DeleteMapping("/{collection}/{id}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @PathVariable String collection,
            @PathVariable long id) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }

        try {
            salesService.delete(user.get().companyId(), collection, id);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (NoSuchElementException ex) {
            return notFound(ex);
        }
    }

    private Optional<AuthSessionUser> currentUser(HttpSession session) {
        return sessionAuthService.currentUser(session);
    }

    private static ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
    }

    private static ResponseEntity<Map<String, String>> notFound(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
    }

    private static ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }

    private static ResponseEntity<Map<String, String>> storageUnavailable(ObjectStorageDisabledException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
    }

    private static Long nullableLong(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return Long.parseLong(raw);
    }

    private static String firstNonBlank(String first, String second) {
        return first != null && !first.isBlank() ? first : second;
    }
}
