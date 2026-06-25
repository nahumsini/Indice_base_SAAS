package com.indice.erp.finance;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/finance")
public class FinanceContextController {

    private final FinanceRequestGuard guard;

    public FinanceContextController(FinanceRequestGuard guard) {
        this.guard = guard;
    }

    @GetMapping("/context")
    public ResponseEntity<?> context(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(access.context());
    }
}
