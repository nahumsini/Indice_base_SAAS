package com.indice.erp.processTasks.agenda;

import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agenda")
public class AgendaApiController {

    private final SessionAuthService sessionAuthService;
    private final AgendaService agendaService;

    public AgendaApiController(SessionAuthService sessionAuthService, AgendaService agendaService) {
        this.sessionAuthService = sessionAuthService;
        this.agendaService = agendaService;
    }

    @GetMapping
    public ResponseEntity<?> list(
            HttpSession session,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(agendaService.listAgendaTasks(user.get().companyId(), from, to));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
