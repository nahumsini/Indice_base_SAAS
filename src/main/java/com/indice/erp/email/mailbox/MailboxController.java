package com.indice.erp.email.mailbox;

import com.indice.erp.access.module.RequiresModuleAccess;
import com.indice.erp.auth.*;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.email.mailbox.MailboxContracts.*;

@RestController
@RequestMapping("/api/v1/email/mailboxes")
@RequiresModuleAccess("correo")
public class MailboxController {
    private final SessionAuthService auth;private final SessionCsrfService csrf;private final MailboxService mailbox;private final MailDraftService drafts;
    public MailboxController(SessionAuthService auth,SessionCsrfService csrf,MailboxService mailbox,MailDraftService drafts){this.auth=auth;this.csrf=csrf;this.mailbox=mailbox;this.drafts=drafts;}
    private AuthSessionUser actor(HttpSession session,String token,boolean write){
        var actor=auth.currentUser(session).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(auth.isPublicDemoSession(session))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if(write)try{csrf.requireCsrf(session,token);}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.FORBIDDEN);}
        return actor;
    }
    @GetMapping public List<Account> accounts(HttpSession session){return mailbox.accounts(actor(session,null,false));}
    @GetMapping("/{account}") public Workspace workspace(HttpSession session,@PathVariable String account){return mailbox.workspace(actor(session,null,false),account);}
    @GetMapping("/{account}/messages") public Page list(HttpSession session,@PathVariable String account,@RequestParam String folder,@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="0") int offset){return mailbox.list(actor(session,null,false),account,folder,query,offset);}
    @GetMapping("/{account}/messages/{id}") public Message get(HttpSession session,@PathVariable String account,@PathVariable String id){return mailbox.get(actor(session,null,false),account,id);}
    @PostMapping("/{account}/sync") public Workspace sync(HttpSession session,@RequestHeader(name="X-CSRF-Token",required=false) String token,@PathVariable String account,@Valid @RequestBody SyncInput input){return mailbox.sync(actor(session,token,true),account,input);}
    @PostMapping("/{account}/messages/{id}/open") public Message open(HttpSession session,@RequestHeader(name="X-CSRF-Token",required=false) String token,@PathVariable String account,@PathVariable String id){return mailbox.open(actor(session,token,true),account,id);}
    @PostMapping("/{account}/messages/{id}/action") public Message action(HttpSession session,@RequestHeader(name="X-CSRF-Token",required=false) String token,@PathVariable String account,@PathVariable String id,@Valid @RequestBody ActionInput input){return mailbox.action(actor(session,token,true),account,id,input);}
    @PutMapping("/{account}/drafts/{id}") public Message save(HttpSession session,@RequestHeader(name="X-CSRF-Token",required=false) String token,@PathVariable String account,@PathVariable String id,@Valid @RequestBody DraftInput input){return drafts.save(actor(session,token,true),account,id,input);}
    @PostMapping("/{account}/drafts/{id}/send") public Message send(HttpSession session,@RequestHeader(name="X-CSRF-Token",required=false) String token,@PathVariable String account,@PathVariable String id,@Valid @RequestBody Version input){return drafts.send(actor(session,token,true),account,id,input);}
    @PostMapping("/{account}/drafts/{id}/discard") public void discard(HttpSession session,@RequestHeader(name="X-CSRF-Token",required=false) String token,@PathVariable String account,@PathVariable String id,@Valid @RequestBody Version input){drafts.discard(actor(session,token,true),account,id,input);}
}
