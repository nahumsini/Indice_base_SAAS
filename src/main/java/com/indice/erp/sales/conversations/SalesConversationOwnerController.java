package com.indice.erp.sales.conversations;

import static com.indice.erp.sales.conversations.SalesConversationController.actor;
import static com.indice.erp.sales.conversations.SalesConversationOwnerBridge.*;
import com.indice.erp.auth.*;
import com.indice.erp.access.module.RequiresModuleAccess;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sales/conversations/{id}")
@RequiresModuleAccess("crm")
public record SalesConversationOwnerController(SessionAuthService auth,SessionCsrfService csrf,SalesConversationOwnerBridge bridge) {
    @GetMapping("/crm") public CrmContext crm(HttpSession s,@PathVariable String id,@RequestParam(defaultValue="")String q){return bridge.crm(actor(auth,csrf,s,null,false),id,q);}
    @GetMapping("/tasks") public TaskContext tasks(HttpSession s,@PathVariable String id){return bridge.tasks(actor(auth,csrf,s,null,false),id);}
    @PostMapping("/links") public SalesConversationDtos.Receipt link(HttpSession s,@PathVariable String id,@RequestHeader(name="X-CSRF-Token",required=false)String token,@Valid @RequestBody Link input){return bridge.link(actor(auth,csrf,s,token,true),id,input);}
    @PostMapping("/create-contact") public SalesConversationDtos.Receipt contact(HttpSession s,@PathVariable String id,@RequestHeader(name="X-CSRF-Token",required=false)String token,@Valid @RequestBody ContactInput input){return bridge.contact(actor(auth,csrf,s,token,true),id,input);}
    @PostMapping("/create-opportunity") public SalesConversationDtos.Receipt opportunity(HttpSession s,@PathVariable String id,@RequestHeader(name="X-CSRF-Token",required=false)String token,@Valid @RequestBody OpportunityInput input){return bridge.opportunity(actor(auth,csrf,s,token,true),id,input);}
    @PostMapping("/tasks") public SalesConversationDtos.Receipt task(HttpSession s,@PathVariable String id,@RequestHeader(name="X-CSRF-Token",required=false)String token,@Valid @RequestBody TaskInput input){return bridge.task(actor(auth,csrf,s,token,true),id,input);}
}
