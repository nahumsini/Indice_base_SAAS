package com.indice.erp.platformadmin;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.pos.square.SquareActivationDtos;
import com.indice.erp.pos.square.SquareCompanyActivationService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/platform-admin/companies/{companyId}/square/activation")
public class PlatformSquareActivationController {
    private final SessionAuthService auth; private final SessionCsrfService csrf;
    private final SquareCompanyActivationService service;
    @GetMapping
    public SquareActivationDtos.Status get(HttpSession session,@PathVariable long companyId) {
        return service.status(actor(session),companyId);
    }
    @PutMapping
    public SquareActivationDtos.Status change(HttpSession session,@PathVariable long companyId,
            @RequestHeader(name="X-CSRF-Token",required=false) String token,
            @Valid @RequestBody SquareActivationDtos.Change request) {
        var actor=actor(session); csrf.requireCsrf(session,token); return service.change(actor,companyId,request);
    }
    private long actor(HttpSession session) { return auth.currentActor(session)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED)).userId(); }
}
