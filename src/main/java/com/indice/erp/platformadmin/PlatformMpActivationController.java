package com.indice.erp.platformadmin;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.pos.mercadopago.MpActivationDtos;
import com.indice.erp.pos.mercadopago.MpCompanyActivationService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/platform-admin/companies/{companyId}/mercado-pago/activation")
public class PlatformMpActivationController {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final MpCompanyActivationService service;
    @GetMapping
    public MpActivationDtos.Status get(HttpSession session, @PathVariable long companyId) {
        return service.status(actor(session), companyId);
    }
    @PutMapping
    public MpActivationDtos.Status change(HttpSession session, @PathVariable long companyId,
            @RequestHeader(name = "X-CSRF-Token", required = false) String token,
            @Valid @RequestBody MpActivationDtos.Change request) {
        var actor = actor(session); csrf.requireCsrf(session, token);
        return service.change(actor, companyId, request);
    }
    private long actor(HttpSession session) { return auth.currentActor(session)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED)).userId(); }
}
