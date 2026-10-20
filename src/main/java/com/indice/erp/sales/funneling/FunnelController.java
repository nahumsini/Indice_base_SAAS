package com.indice.erp.sales.funneling;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.module.RequiresModuleAccess;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.sales.funneling.FunnelContracts.*;

@RestController
@RequestMapping("/api/v1/sales/funnels")
@RequiresModuleAccess("crm")
public class FunnelController {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    private final FunnelService service;
    private final ContentCalendarService calendar;
    public FunnelController(SessionAuthService auth, SessionCsrfService csrf, ModuleAccessService modules,
        TabPermissionAccessService tabs, FunnelService service, ContentCalendarService calendar) {
        this.auth = auth; this.csrf = csrf; this.modules = modules; this.tabs = tabs; this.service = service;
        this.calendar = calendar;
    }

    private AuthSessionUser actor(HttpSession session, String token, boolean write) {
        var actor = auth.currentUser(session).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (auth.isPublicDemoSession(session) || !modules.canAccess(actor, "crm")
            || !tabs.canAccess(actor, TabPermissionRequirement.one("crm.funneling"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (write) {
            try { csrf.requireCsrf(session, token); }
            catch (IllegalArgumentException invalid) { throw new ResponseStatusException(HttpStatus.FORBIDDEN); }
        }
        return actor;
    }

    @GetMapping
    public PlanPage list(HttpSession session, @RequestParam(defaultValue = "") String search,
        @RequestParam(defaultValue = "ALL") String status, @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "25") int pageSize, @RequestParam(defaultValue = "updatedAt") String sort,
        @RequestParam(defaultValue = "desc") String direction) {
        return service.list(actor(session, null, false), search, status, page, pageSize, sort, direction);
    }

    @GetMapping("/{id}")
    public Plan get(HttpSession session, @PathVariable String id) { return service.get(actor(session, null, false), id); }

    @PutMapping("/{id}")
    public Plan save(HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String token,
        @PathVariable String id, @Valid @RequestBody PlanInput input) {
        return service.save(actor(session, token, true), id, input);
    }

    @GetMapping("/{id}/content-calendar")
    public ContentCalendarContracts.Calendar calendar(HttpSession session, @PathVariable String id) {
        return calendar.get(actor(session, null, false), id);
    }
    @PutMapping("/{id}/content-calendar")
    public ContentCalendarContracts.Calendar saveCalendar(HttpSession session, @PathVariable String id,
        @RequestHeader(name = "X-CSRF-Token", required = false) String token,
        @RequestHeader(name = "X-Content-Calendar-Actor", required = false) String expectedActor,
        @Valid @RequestBody ContentCalendarContracts.Input input) {
        return calendar.save(actor(session, token, true), id, expectedActor, input);
    }
}
