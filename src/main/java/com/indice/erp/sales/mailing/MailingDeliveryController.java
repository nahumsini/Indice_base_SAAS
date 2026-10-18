package com.indice.erp.sales.mailing;
import com.indice.erp.auth.*;
import com.indice.erp.access.module.RequiresModuleAccess;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.sales.mailing.MailingDeliveryContracts.*;
@RestController
@RequestMapping("/api/v1/mailing")
@RequiresModuleAccess("crm")
public class MailingDeliveryController {
    private final SessionAuthService auth;private final SessionCsrfService csrf;private final MailingDeliveryService service;
    public MailingDeliveryController(SessionAuthService auth,SessionCsrfService csrf,MailingDeliveryService service){this.auth=auth;this.csrf=csrf;this.service=service;}
    private AuthSessionUser actor(HttpSession s,String token,boolean write){var a=auth.currentUser(s).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));if(auth.isPublicDemoSession(s))throw new ResponseStatusException(HttpStatus.FORBIDDEN);if(write)try{csrf.requireCsrf(s,token);}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.FORBIDDEN);}return a;}
    @GetMapping("/campaigns/{id}/review") public Review review(HttpSession s,@PathVariable String id){return service.review(actor(s,null,false),id);}
    @GetMapping("/campaigns/{id}/results") public Results results(HttpSession s,@PathVariable String id){return service.results(actor(s,null,false),id);}
    @PostMapping("/consents") public void consent(HttpSession s,@RequestHeader(name="X-CSRF-Token",required=false)String token,@Valid @RequestBody Consent input){service.consent(actor(s,token,true),input);}
    @PostMapping("/campaigns/{id}/launch") public Results launch(HttpSession s,@RequestHeader(name="X-CSRF-Token",required=false)String token,@PathVariable String id,@Valid @RequestBody Launch input){return service.launch(actor(s,token,true),id,input);}
    @PostMapping("/campaigns/{id}/test") public SendResult test(HttpSession s,@RequestHeader(name="X-CSRF-Token",required=false)String token,@PathVariable String id,@Valid @RequestBody TestInput input){return service.test(actor(s,token,true),id,input);}
    @PostMapping("/campaigns/{id}/control") public Results control(HttpSession s,@RequestHeader(name="X-CSRF-Token",required=false)String token,@PathVariable String id,@Valid @RequestBody Control input){return service.control(actor(s,token,true),id,input);}
}
