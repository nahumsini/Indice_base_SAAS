package com.indice.erp.messaging;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import static com.indice.erp.messaging.MessagingContracts.*;

@RestController
@RequestMapping({"/api/v1/messaging", "/api/v1/platform-admin/customer-care", "/api/v1/distributor-portal/customer-care"})
public class MessagingController {
    private final MessagingAccess access;
    private final MessagingService service;
    private final MessagingAttachmentService attachments;
    public MessagingController(MessagingAccess access,MessagingService service,MessagingAttachmentService attachments) { this.access=access; this.service=service; this.attachments=attachments; }
    @PostMapping("/conversations/{id}/attachments")
    public PhotoUploadResult upload(HttpServletRequest r,@PathVariable long id,@RequestBody PhotoUpload request) {
        return attachments.presign(access.actor(r),id,request);
    }
    @GetMapping("/conversations/{id}/attachments/{attachmentId}")
    public org.springframework.http.ResponseEntity<PhotoDownload> photo(HttpServletRequest r,@PathVariable long id,@PathVariable String attachmentId) {
        return org.springframework.http.ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore())
            .body(attachments.download(access.actor(r),id,attachmentId));
    }
    @GetMapping("/context") public Context context(HttpServletRequest r) { return service.context(access.actor(r)); }
    @GetMapping("/unread") public long unread(HttpServletRequest r) { return service.unread(access.actor(r)); }
    @GetMapping("/directory") public List<Person> directory(HttpServletRequest r,@RequestParam(defaultValue="") String q) { return service.directory(access.actor(r),q); }
    @GetMapping("/conversations") public Page<Conversation> list(HttpServletRequest r,@RequestParam(defaultValue="ALL") String filter,
        @RequestParam(defaultValue="") String q,@RequestParam(defaultValue="0") int offset) { return service.list(access.actor(r),filter,q,offset); }
    @PostMapping("/conversations") @ResponseStatus(HttpStatus.CREATED)
    public Detail create(HttpServletRequest r,@RequestBody Create request) { return service.create(access.actor(r),request); }
    @GetMapping("/conversations/{id}") public Detail detail(HttpServletRequest r,@PathVariable long id,
        @RequestParam(defaultValue="0") long after,@RequestParam(defaultValue="0") long before) { return service.detail(access.actor(r),id,after,before); }
    @PostMapping("/conversations/{id}/messages") @ResponseStatus(HttpStatus.CREATED)
    public Message send(HttpServletRequest r,@PathVariable long id,@RequestBody Send request) { return service.send(access.actor(r),id,request); }
    @PostMapping("/conversations/{id}/read") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void read(HttpServletRequest r,@PathVariable long id,@RequestBody Read request) { service.read(access.actor(r),id,request); }
    @PatchMapping("/conversations/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void change(HttpServletRequest r,@PathVariable long id,@RequestBody Change request) { service.change(access.actor(r),id,request); }
    @GetMapping("/summary") public Summary summary(HttpServletRequest r) { return service.summary(access.actor(r)); }
    @GetMapping("/assignees") public List<Person> assignees(HttpServletRequest r) { return service.assignees(access.actor(r)); }
    @GetMapping("/conversations/{id}/audit") public List<Audit> audit(HttpServletRequest r,@PathVariable long id,
        @RequestParam(defaultValue="0") long before) { return service.audit(access.actor(r),id,before); }
}
