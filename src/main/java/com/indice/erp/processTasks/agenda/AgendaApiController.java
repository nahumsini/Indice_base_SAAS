package com.indice.erp.processTasks.agenda;

import com.indice.erp.processTasks.ProcessTasksRequestGuard;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agenda")
public class AgendaApiController {

    private final ProcessTasksRequestGuard guard;
    private final AgendaService agendaService;

    public AgendaApiController(
        ProcessTasksRequestGuard guard,
        AgendaService agendaService
    ) {
        this.guard = guard;
        this.agendaService = agendaService;
    }

    @GetMapping
    public ResponseEntity<?> list(
            HttpSession session,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return access.error();
        }

        try {
            return ResponseEntity.ok(agendaService.listAgendaTasks(
                    access.user().companyId(),
                    access.user().userId(),
                    from,
                    to));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
