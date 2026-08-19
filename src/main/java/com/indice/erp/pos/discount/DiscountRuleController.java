package com.indice.erp.pos.discount;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.discount.DiscountDtos.EvaluationRequest;
import com.indice.erp.pos.discount.DiscountDtos.RuleRequest;
import com.indice.erp.pos.discount.DiscountDtos.StatusRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos/discounts")
public class DiscountRuleController {

    private final PosRequestGuard guard;
    private final DiscountRuleService service;

    public DiscountRuleController(PosRequestGuard guard, DiscountRuleService service) {
        this.guard = guard;
        this.service = service;
    }

    @GetMapping
    @RequiresCapability("sales")
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.list(access.context()));
    }

    @GetMapping("/published")
    @RequiresCapability("pos")
    public ResponseEntity<?> published(
            HttpSession session,
            @RequestParam String channel,
            @RequestParam String currencyCode,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false) Long businessId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        var context = access.context();
        return ResponseEntity.ok(service.publishedRules(
            context.companyId(), unitId, businessId, warehouseId, channel, currencyCode));
    }

    @PostMapping
    @RequiresCapability("sales")
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody RuleRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.status(HttpStatus.CREATED).body(service.create(access.context(), request));
    }

    @PutMapping("/{ruleId}")
    @RequiresCapability("sales")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long ruleId,
            @Valid @RequestBody RuleRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(service.update(access.context(), ruleId, request));
    }

    @PatchMapping("/{ruleId}/status")
    @RequiresCapability("sales")
    public ResponseEntity<?> status(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long ruleId,
            @Valid @RequestBody StatusRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(service.transition(access.context(), ruleId, request));
    }

    @DeleteMapping("/{ruleId}")
    @RequiresCapability("sales")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long ruleId,
            @RequestParam(required = false) Long version) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.delete(access.context(), ruleId, version));
    }

    @PostMapping("/evaluate")
    @RequiresCapability("pos")
    public ResponseEntity<?> evaluate(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody EvaluationRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(service.evaluate(access.context(), request));
    }
}
