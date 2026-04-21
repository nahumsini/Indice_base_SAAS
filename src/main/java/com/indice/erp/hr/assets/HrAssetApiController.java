package com.indice.erp.hr.assets;

import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/assets")
public class HrAssetApiController {

    private final SessionAuthService sessionAuthService;
    private final HrAssetService hrAssetService;

    public HrAssetApiController(
        SessionAuthService sessionAuthService,
        HrAssetService hrAssetService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.hrAssetService = hrAssetService;
    }

    @GetMapping
    public ResponseEntity<?> list(
        HttpSession session,
        @RequestParam(required = false) String search,
        @RequestParam(name = "asset_type", required = false) String assetType,
        @RequestParam(required = false) String status,
        @RequestParam(name = "unit_id", required = false) Long unitId,
        @RequestParam(name = "responsible_employee_id", required = false) Long responsibleEmployeeId,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            var filters = new LinkedHashMap<String, Object>();
            filters.put("search", search);
            filters.put("asset_type", assetType);
            filters.put("status", status);
            filters.put("unit_id", unitId);
            filters.put("responsible_employee_id", responsibleEmployeeId);
            filters.put("page", page);
            filters.put("size", size);

            var result = hrAssetService.listAssets(user.get().companyId(), filters);
            var body = new LinkedHashMap<String, Object>();
            body.put("items", result.get("rows"));
            body.put("count", ((java.util.List<?>) result.get("rows")).size());
            body.put("page", result.get("page"));
            body.put("size", result.get("size"));
            body.put("total_count", result.get("total_count"));
            body.put("total_pages", result.get("total_pages"));
            body.put("summary", result.get("summary"));
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/{assetId}")
    public ResponseEntity<?> details(HttpSession session, @PathVariable long assetId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(hrAssetService.assetDetails(user.get().companyId(), assetId).get("asset"));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> create(HttpSession session, @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            var result = hrAssetService.createAsset(user.get().companyId(), user.get().userId(), payload);
            return ResponseEntity.status(HttpStatus.CREATED).body(result.get("asset"));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{assetId}")
    public ResponseEntity<?> update(HttpSession session, @PathVariable long assetId, @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            var result = hrAssetService.updateAsset(user.get().companyId(), user.get().userId(), assetId, payload);
            return ResponseEntity.ok(result.get("asset"));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{assetId}/reassign")
    public ResponseEntity<?> reassign(HttpSession session, @PathVariable long assetId, @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            var result = hrAssetService.reassignAsset(user.get().companyId(), user.get().userId(), assetId, payload);
            return ResponseEntity.ok(result.get("asset"));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{assetId}/status")
    public ResponseEntity<?> changeStatus(HttpSession session, @PathVariable long assetId, @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            var result = hrAssetService.changeStatus(user.get().companyId(), user.get().userId(), assetId, payload);
            return ResponseEntity.ok(result.get("asset"));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/{assetId}/history")
    public ResponseEntity<?> history(HttpSession session, @PathVariable long assetId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(hrAssetService.assetHistory(user.get().companyId(), assetId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }
}
