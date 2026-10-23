package com.indice.erp.sales.conversations;

import static com.indice.erp.sales.conversations.SalesConversationDtos.*;
import com.indice.erp.auth.*;
import com.indice.erp.access.module.RequiresModuleAccess;
import com.indice.erp.sales.conversations.whatsapp.WhatsAppConnectionService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.Objects;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/v1/sales/conversations")
@RequiresModuleAccess("crm")
public class SalesConversationController {
    private final SessionAuthService auth;private final SessionCsrfService csrf;
    private final SalesConversationService service;private final WhatsAppConnectionService connections;
    public SalesConversationController(SessionAuthService auth,SessionCsrfService csrf,SalesConversationService service,WhatsAppConnectionService connections){this.auth=auth;this.csrf=csrf;this.service=service;this.connections=connections;}
    public static AuthSessionUser actor(SessionAuthService auth,SessionCsrfService csrf,HttpSession session,String token,boolean write){
        var real=auth.currentActor(session).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        var effective=auth.currentUser(session).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(auth.isPublicDemoSession(session)||!Objects.equals(real.userCompanyId(),effective.userCompanyId())||!Objects.equals(real.companyId(),effective.companyId()))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if(write)try{csrf.requireCsrf(session,token);}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.FORBIDDEN);}
        return real;
    }
    @GetMapping("/context") public Context context(HttpSession session){return connections.context(actor(auth,csrf,session,null,false));}
    @GetMapping public Page list(HttpSession s,@RequestParam(defaultValue="MINE")String box,@RequestParam(defaultValue="")String q,@RequestParam(defaultValue="1")int page,@RequestParam(defaultValue="25")int pageSize){return service.list(actor(auth,csrf,s,null,false),box,q,page,pageSize);}
    @GetMapping("/{id}/eligible-members") public java.util.List<Member> eligible(HttpSession s,@PathVariable String id){return service.eligibleMembers(actor(auth,csrf,s,null,false),id);}
    @GetMapping("/{id}") public Timeline timeline(HttpSession s,@PathVariable String id,@RequestParam(defaultValue="0")long after,@RequestParam(required=false)Instant before){return service.timeline(actor(auth,csrf,s,null,false),id,after,before);}
    @GetMapping("/{id}/history") public History history(HttpSession s,@PathVariable String id,@RequestParam(required=false)String beforeMessage,@RequestParam(required=false)String beforeNote,@RequestParam(required=false)Long beforeEvent){return service.history(actor(auth,csrf,s,null,false),id,beforeMessage,beforeNote,beforeEvent);}
    @PostMapping("/{id}/commands") public Receipt command(HttpSession s,@PathVariable String id,@RequestHeader(name="X-CSRF-Token",required=false)String token,@Valid @RequestBody Command input){return service.command(actor(auth,csrf,s,token,true),id,input);}
    @PostMapping("/{id}/messages") public Receipt message(HttpSession s,@PathVariable String id,@RequestHeader(name="X-CSRF-Token",required=false)String token,@Valid @RequestBody Text input){return service.text(actor(auth,csrf,s,token,true),id,input,false);}
    @PostMapping("/{id}/notes") public Receipt note(HttpSession s,@PathVariable String id,@RequestHeader(name="X-CSRF-Token",required=false)String token,@Valid @RequestBody Text input){return service.text(actor(auth,csrf,s,token,true),id,input,true);}
}
