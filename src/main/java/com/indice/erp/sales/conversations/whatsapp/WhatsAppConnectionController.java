package com.indice.erp.sales.conversations.whatsapp;

import static com.indice.erp.sales.conversations.SalesConversationController.actor;
import static com.indice.erp.sales.conversations.SalesConversationDtos.*;
import com.indice.erp.auth.*;
import com.indice.erp.access.module.RequiresModuleAccess;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sales/whatsapp/connections")
@RequiresModuleAccess("crm")
public record WhatsAppConnectionController(SessionAuthService auth,SessionCsrfService csrf,WhatsAppConnectionService service,WhatsAppOnboardingService onboarding,WhatsAppConnectionOperations operations,WhatsAppOperationalMetrics metrics) {
    public record Setup(@NotBlank @Pattern(regexp="[0-9a-fA-F-]{36}")String requestKey) { }
    @GetMapping public Context context(HttpSession s){return service.context(actor(auth,csrf,s,null,false));}
    @PostMapping public Connection setup(HttpSession s,@RequestHeader(name="X-CSRF-Token",required=false)String token,@Valid @RequestBody Setup input){return service.setup(actor(auth,csrf,s,token,true),input.requestKey());}
    @PostMapping("/{id}/onboarding") public WhatsAppOnboardingService.Start start(HttpSession s,@PathVariable String id,@RequestHeader(name="X-CSRF-Token",required=false)String token){return onboarding.start(actor(auth,csrf,s,token,true),id,s.getId());}
    @PostMapping("/{id}/onboarding/callback") public Connection complete(HttpSession s,@PathVariable String id,@RequestHeader(name="X-CSRF-Token",required=false)String token,@RequestBody WhatsAppOnboardingService.Callback input){return onboarding.complete(actor(auth,csrf,s,token,true),id,s.getId(),input);}
    @PostMapping("/{id}/control") public Connection control(HttpSession s,@PathVariable String id,@RequestHeader(name="X-CSRF-Token",required=false)String token,@Valid @RequestBody WhatsAppConnectionOperations.Control input){return operations.control(actor(auth,csrf,s,token,true),id,input);}
    @GetMapping("/{id}/operations") public WhatsAppOperationalMetrics.Snapshot metrics(HttpSession s,@PathVariable String id){return metrics.forManager(actor(auth,csrf,s,null,false),id);}
    @GetMapping("/{id}/candidates") public List<Member> candidates(HttpSession s,@PathVariable String id){return service.candidates(actor(auth,csrf,s,null,false),id);}
    @GetMapping("/{id}/members") public List<Member> members(HttpSession s,@PathVariable String id){return service.members(actor(auth,csrf,s,null,false),id);}
    @PutMapping("/{id}/members/{member}") public List<Member> grant(HttpSession s,@PathVariable String id,@PathVariable long member,@RequestHeader(name="X-CSRF-Token",required=false)String token,@Valid @RequestBody Grant input){return service.grant(actor(auth,csrf,s,token,true),id,member,input);}
}
