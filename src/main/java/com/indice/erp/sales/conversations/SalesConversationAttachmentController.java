package com.indice.erp.sales.conversations;

import static com.indice.erp.sales.conversations.SalesConversationController.actor;
import com.indice.erp.auth.*;
import com.indice.erp.access.module.RequiresModuleAccess;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sales/conversations/{conversation}/attachments")
@RequiresModuleAccess("crm")
public record SalesConversationAttachmentController(SessionAuthService auth,SessionCsrfService csrf,SalesConversationAttachmentService service) {
    @PostMapping public SalesConversationAttachmentService.UploadResult prepare(HttpSession s,@PathVariable String conversation,@RequestHeader(name="X-CSRF-Token",required=false)String token,@Valid @RequestBody SalesConversationAttachmentService.Upload input){return service.prepare(actor(auth,csrf,s,token,true),conversation,input);}
    @PostMapping("/{id}/finalize") public SalesConversationDtos.Attachment finalizeUpload(HttpSession s,@PathVariable String conversation,@PathVariable String id,@RequestHeader(name="X-CSRF-Token",required=false)String token){return service.finalizeUpload(actor(auth,csrf,s,token,true),conversation,id);}
    @GetMapping("/{id}/content") public ResponseEntity<byte[]> content(HttpSession s,@PathVariable String conversation,@PathVariable String id){var result=service.download(actor(auth,csrf,s,null,false),conversation,id);var headers=new HttpHeaders();headers.setCacheControl(CacheControl.noStore());headers.set("X-Content-Type-Options","nosniff");headers.setContentType(MediaType.parseMediaType(result.contentType()));headers.setContentDisposition((result.contentType().startsWith("image/")?ContentDisposition.inline():ContentDisposition.attachment()).filename(result.fileName(),java.nio.charset.StandardCharsets.UTF_8).build());return ResponseEntity.ok().headers(headers).body(result.bytes());}
}
