package com.indice.erp.salesboard;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.access.module.*;
import com.indice.erp.access.tab.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/sales-board")
@RequiresModuleAccess("sales_board")
public class SalesBoardController {
    private final SessionAuthService auth; private final ModuleAccessService modules; private final TabPermissionAccessService tabs; private final SalesBoardService service;
    public SalesBoardController(SessionAuthService auth,ModuleAccessService modules,TabPermissionAccessService tabs,SalesBoardService service) {
        this.auth=auth;this.modules=modules;this.tabs=tabs;this.service=service;
    }
    @GetMapping
    public SalesBoardContracts.Workspace read(HttpSession session,@RequestParam(defaultValue="") String from,@RequestParam(defaultValue="") String to,
        @RequestParam(defaultValue="") String search,@RequestParam(defaultValue="ALL") String origin,@RequestParam(defaultValue="") String channel,
        @RequestParam(defaultValue="ALL") String status,@RequestParam(required=false) Long unitId,@RequestParam(required=false) Long businessId,
        @RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="25") int pageSize,@RequestParam(defaultValue="date") String sort,
        @RequestParam(defaultValue="desc") String direction,@RequestParam(defaultValue="MXN") String preferredCurrency,@RequestParam(defaultValue="auto") String granularity) {
        var actor=auth.currentUser(session).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(auth.isPublicDemoSession(session) || !modules.canAccess(actor,"sales_board") || !tabs.canAccess(actor,TabPermissionRequirement.one("sales_board.overview")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return service.read(actor,from,to,search,origin,channel,status,unitId,businessId,page,pageSize,sort,direction,preferredCurrency,granularity);
    }
}
