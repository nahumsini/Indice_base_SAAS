package com.indice.erp.scheduling;

import com.indice.erp.access.module.RequiresModuleAccess;
import com.indice.erp.sales.SalesClientDirectoryService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/scheduling/clients")
@RequiresModuleAccess("scheduling")
public class SchedulingClientsController {
    private final SchedulingAccessService access;
    private final SalesClientDirectoryService directory;
    public SchedulingClientsController(SchedulingAccessService access,SalesClientDirectoryService directory){this.access=access;this.directory=directory;}
    @GetMapping public SalesClientDirectoryService.Directory clients(HttpSession session,
        @RequestParam(defaultValue="")String search,@RequestParam(defaultValue="1")int page,@RequestParam(defaultValue="25")int pageSize){
        var actor=access.require(session,"clients",null,false);SchedulingAccessService.requireAdministrator(actor);
        return directory.read(actor.companyId(),search,page,pageSize);
    }
}
