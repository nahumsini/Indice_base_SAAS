package com.indice.erp.messaging;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.messaging.MessagingContracts.*;

@Service
public class MessagingService {
    private final MessagingRepository repository;
    private final MessagingAccess access;
    private final MessagingAttachmentService attachments;
    public MessagingService(MessagingRepository repository, MessagingAccess access,MessagingAttachmentService attachments) { this.repository=repository; this.access=access; this.attachments=attachments; }

    @Transactional(readOnly=true)
    public Context context(Actor a) { member(a); return new Context(a.userId(),a.companyId(),a.membershipId(),a.supportOnly()?null:repository.distributor(a.companyId()),a.supportOnly()); }
    @Transactional(readOnly=true)
    public long unread(Actor a) { member(a); return repository.unread(a); }
    @Transactional(readOnly=true)
    public List<Person> directory(Actor a, String query) { member(a); if(a.supportOnly()) throw MessagingAccess.forbidden(); return repository.directory(a,text(query,100,false)); }
    @Transactional(readOnly=true)
    public Page<Conversation> list(Actor a,String filter,String query,int offset) {
        if (offset<0 || offset>100_000) throw invalid();
        allowed(filter,Set.of("ALL","DIRECT","SUPPORT","DISTRIBUTOR","UNASSIGNED","MINE","OPEN","WAITING_CUSTOMER","RESOLVED"));
        return repository.list(a,filter,text(query,100,false),offset);
    }
    @Transactional(readOnly=true)
    public Detail detail(Actor a,long id,long after,long before) {
        if (after<0 || before<0 || (after>0 && before>0)) throw invalid();
        var c=authorized(a,id,false);
        var page=repository.messages(a,id,after,before);
        return new Detail(c,new Page<>(attachments.decorate(c,page.items()),page.hasMore()));
    }
    @Transactional
    public Detail create(Actor a,Create raw) {
        member(a);
        if(raw==null) throw invalid();
        var kind=allowed(raw.kind(),Set.of("DIRECT","SUPPORT","DISTRIBUTOR"));
        if(a.supportOnly() && !"SUPPORT".equals(kind)) throw MessagingAccess.forbidden();
        var r=new Create(kind,raw.recipientMembershipId(),text(raw.subject(),180,true),
            allowed(raw.topic(),Set.of("CONSULTATION","FAILURE","IMPROVEMENT")),text(raw.moduleName(),120,false),
            allowed(raw.language(),Set.of("es-MX","es-CO","en-US","en-CA","fr-CA","pt-BR","ko-CA","zh-CA")),text(raw.body(),8000,true),uuid(raw.requestKey()));
        String directKey=null;
        if("DIRECT".equals(kind)) {
            if(r.recipientMembershipId()==null || Objects.equals(r.recipientMembershipId(),a.membershipId())
                || !repository.activeRecipient(a,r.recipientMembershipId())) throw invalid();
            directKey=Math.min(a.membershipId(),r.recipientMembershipId())+":"+Math.max(a.membershipId(),r.recipientMembershipId());
        } else if(r.recipientMembershipId()!=null) throw invalid();
        var distributor="DISTRIBUTOR".equals(kind) ? repository.distributor(a.companyId()) : null;
        if("DISTRIBUTOR".equals(kind) && distributor==null) throw MessagingAccess.forbidden();
        var existing=repository.creation(a,r.requestKey());
        var fingerprint=fingerprint(r);
        if(existing!=null) {
            authorized(a,existing,true);
            if(!fingerprint.equals(repository.creationFingerprint(a,r.requestKey()))) throw conflict();
            send(a,existing,new Send(r.body(),"PUBLIC",r.requestKey()));
            return detail(a,existing,0,0);
        }
        long id=repository.create(a,r,distributor==null?null:distributor.id(),directKey,fingerprint);
        var stored=repository.creationFingerprint(a,r.requestKey());
        if(stored!=null && !stored.equals(fingerprint)) throw conflict();
        var previous=repository.duplicate(a,id,r.requestKey());
        send(a,id,new Send(r.body(),"PUBLIC",r.requestKey()));
        if(previous==null) repository.audit(a,id,"CREATED","Conversation opened");
        return detail(a,id,0,0);
    }
    @Transactional
    public Message send(Actor a,long id,Send raw) {
        if(raw==null) throw invalid();
        var ids=MessagingAttachmentService.ids(raw.attachmentIds());
        var r=new Send(text(raw.body(),8000,ids.isEmpty()),allowed(raw.visibility(),Set.of("PUBLIC","INTERNAL")),uuid(raw.requestKey()),ids);
        var c=authorized(a,id,true);
        if(a.member() && !"PUBLIC".equals(r.visibility())) throw MessagingAccess.forbidden();
        var duplicate=repository.duplicate(a,id,r.requestKey());
        if(duplicate!=null) {
            var result=attachments.decorate(c,List.of(duplicate)).getFirst();
            if(!duplicate.body().equals(r.body()) || !duplicate.visibility().equals(r.visibility())
                || !result.attachments().stream().map(Attachment::id).sorted().toList().equals(ids)) throw conflict();
            return result;
        }
        if("DIRECT".equals(c.kind())) {
            // A revoked membership cannot continue receiving new employee messages.
            if(repository.hasRevokedParticipant(id,c.companyId())) throw MessagingAccess.forbidden();
        }
        repository.requireSendCapacity(a);
        var message=repository.insertMessage(a,id,r);
        attachments.bind(a,c,message,ids);
        repository.afterMessage(a,c,message);
        if("RESOLVED".equals(c.status()) && "PUBLIC".equals(r.visibility())) repository.audit(a,id,"REOPENED","Conversation reopened by a reply");
        return attachments.decorate(c,List.of(message)).getFirst();
    }
    @Transactional
    public void read(Actor a,long id,Read request) {
        authorized(a,id,true);
        if(request==null || request.messageId()<=0) throw invalid();
        repository.read(a,id,request.messageId());
    }
    @Transactional
    public void change(Actor a,long id,Change r) {
        staff(a);
        if(r==null) throw invalid();
        var c=authorized(a,id,true);
        if(r.version()!=c.version()) throw conflict();
        switch(r.action()==null?"":r.action()) {
            case "ASSIGN" -> {
                if(r.assigneeUserId()!=null && repository.assignees(a).stream().noneMatch(p->p.id()==r.assigneeUserId())) throw invalid();
                repository.assign(id,r.assigneeUserId());
                repository.audit(a,id,"ASSIGN",r.assigneeUserId()==null?"Unassigned":"User "+r.assigneeUserId());
            }
            case "STATUS" -> {
                var status=allowed(r.value(),Set.of("OPEN","WAITING_CUSTOMER","RESOLVED"));
                repository.status(id,status); repository.audit(a,id,"STATUS",c.status()+" -> "+status);
            }
            case "PRIORITY" -> {
                var priority=allowed(r.value(),Set.of("LOW","MEDIUM","HIGH","CRITICAL"));
                repository.priority(id,priority); repository.audit(a,id,"PRIORITY",c.priority()+" -> "+priority);
            }
            case "TRANSFER" -> {
                if(!"DISTRIBUTOR".equals(a.scope())) throw MessagingAccess.forbidden();
                repository.transfer(id); repository.audit(a,id,"TRANSFER","Transferred to Indice support; public history shared");
            }
            default -> throw invalid();
        }
    }
    @Transactional(readOnly=true)
    public Summary summary(Actor a) { staff(a); return repository.summary(a); }
    @Transactional(readOnly=true)
    public List<Person> assignees(Actor a) { staff(a); return repository.assignees(a); }
    @Transactional(readOnly=true)
    public List<Audit> audit(Actor a,long id,long before) { staff(a); authorized(a,id,false); return repository.audit(id,before); }
    private Conversation authorized(Actor a,long id,boolean lock) { var c=repository.find(a,id,lock); access.conversation(a,c); return c; }
    private static void member(Actor a) { if(!a.member()) throw MessagingAccess.forbidden(); }
    private static void staff(Actor a) { if(a.member()) throw MessagingAccess.forbidden(); }
    static String text(String s,int max,boolean required) { var v=s==null?"":s.trim(); if(v.length()>max || (required && v.isEmpty())) throw invalid(); return v; }
    static String uuid(String s) { try { var id=UUID.fromString(s); if(!id.toString().equals(s)) throw invalid(); return s; } catch(RuntimeException e) { throw invalid(); } }
    static String allowed(String s,Set<String> choices) { if(s==null || !choices.contains(s)) throw invalid(); return s; }
    static ResponseStatusException invalid() { return new ResponseStatusException(HttpStatus.BAD_REQUEST,"invalid_messaging_request"); }
    static ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT,"conversation_changed_or_request_reused"); }
    private static String fingerprint(Create r) {
        try {
            var json=new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsBytes(r);
            return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(json));
        } catch(java.io.IOException | java.security.NoSuchAlgorithmException e) { throw new IllegalStateException("Cannot fingerprint conversation",e); }
    }
}
