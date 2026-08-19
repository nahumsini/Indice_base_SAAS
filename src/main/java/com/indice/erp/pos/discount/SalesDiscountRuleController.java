package com.indice.erp.pos.discount;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.discount.DiscountDtos.EvaluationRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sales/discounts")
@RequiresCapability("sales")
public class SalesDiscountRuleController {

    private final PosRequestGuard guard;
    private final DiscountRuleService service;

    public SalesDiscountRuleController(PosRequestGuard guard, DiscountRuleService service) {
        this.guard = guard;
        this.service = service;
    }

    @PostMapping("/evaluate")
    public ResponseEntity<?> evaluate(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody EvaluationRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(service.evaluate(access.context(), request));
    }
}
