package com.indice.erp.email.mailbox;
import com.indice.erp.auth.*;
import com.indice.erp.access.module.RequiresModuleAccess;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.email.mailbox.MailboxContracts.*;
@RestController
@RequestMapping("/api/v1/email/mailboxes/{account}")
@RequiresModuleAccess("correo")
public class MailFeaturesController {
    private final SessionAuthService auth;private final SessionCsrfService csrf;private final MailPreferencesService preferences;private final MailAttachmentService files;private final MailSentCopyService sent;
    public MailFeaturesController(SessionAuthService auth,SessionCsrfService csrf,MailPreferencesService preferences,MailAttachmentService files,MailSentCopyService sent){this.auth=auth;this.csrf=csrf;this.preferences=preferences;this.files=files;this.sent=sent;}
    private AuthSessionUser actor(HttpSession s,String token,boolean write){var a=auth.currentUser(s).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));if(auth.isPublicDemoSession(s))throw new ResponseStatusException(HttpStatus.FORBIDDEN);if(write)try{csrf.requireCsrf(s,token);}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.FORBIDDEN);}return a;}
    @GetMapping("/preferences") public Preferences preferences(HttpSession s,@PathVariable String account){return preferences.get(actor(s,null,false),account);}
    @PutMapping("/preferences") public Preferences preferences(HttpSession s,@RequestHeader(name="X-CSRF-Token",required=false)String token,@PathVariable String account,@Valid @RequestBody PreferencesInput in){return preferences.save(actor(s,token,true),account,in);}
    @PostMapping("/messages/{id}/sent-copy") public Message copy(HttpSession s,@RequestHeader(name="X-CSRF-Token",required=false)String token,@PathVariable String account,@PathVariable String id){return sent.copy(actor(s,token,true),account,id);}
    @GetMapping("/messages/{id}/attachments") public List<Attachment> list(HttpSession s,@PathVariable String account,@PathVariable String id){return files.list(actor(s,null,false),account,id);}
    @PostMapping("/messages/{id}/attachments/upload") public Upload upload(HttpSession s,@RequestHeader(name="X-CSRF-Token",required=false)String token,@PathVariable String account,@PathVariable String id,@Valid @RequestBody UploadInput in){return files.upload(actor(s,token,true),account,id,in);}
    @PostMapping("/messages/{id}/attachments/{file}/register") public Message register(HttpSession s,@RequestHeader(name="X-CSRF-Token",required=false)String token,@PathVariable String account,@PathVariable String id,@PathVariable String file,@Valid @RequestBody Version in){return files.register(actor(s,token,true),account,id,file,in);}
    @PostMapping("/messages/{id}/attachments/{file}/remove") public Message remove(HttpSession s,@RequestHeader(name="X-CSRF-Token",required=false)String token,@PathVariable String account,@PathVariable String id,@PathVariable String file,@Valid @RequestBody Version in){return files.remove(actor(s,token,true),account,id,file,in);}
    @GetMapping("/messages/{id}/attachments/{file}/download") public ResponseEntity<byte[]> download(HttpSession s,@PathVariable String account,@PathVariable String id,@PathVariable String file){var value=files.download(actor(s,null,false),account,id,file);return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").header("Content-Security-Policy","sandbox").header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(value.name(),java.nio.charset.StandardCharsets.UTF_8).build().toString()).contentType(MediaType.APPLICATION_OCTET_STREAM).body(value.bytes());}
}
