package com.indice.erp.sales.conversations;

import static com.indice.erp.sales.conversations.SalesConversationDtos.*;
import static com.indice.erp.sales.conversations.SalesConversationAccess.require;
import static org.springframework.http.HttpStatus.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.conversations.whatsapp.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SalesConversationService {
    private final SalesConversationRepository repository;private final SalesConversationAccess access;
    private final SalesConversationNotificationSource notices;
    private final com.indice.erp.sales.whatsapping.WhatsAppSuppressionContract suppression;
    private final SalesConversationAttachmentService attachments;
    private final SalesConversationAccessReconciler reconciler;
    private final WhatsAppConnectionService connections;private final WhatsAppProperties flags;private final Clock clock;
    public SalesConversationService(SalesConversationRepository repository,SalesConversationAccess access,WhatsAppConnectionService connections,WhatsAppProperties flags,Clock clock,SalesConversationAccessReconciler reconciler,SalesConversationAttachmentService attachments,com.indice.erp.sales.whatsapping.WhatsAppSuppressionContract suppression,SalesConversationNotificationSource notices){this.notices=notices;this.suppression=suppression;this.attachments=attachments;this.reconciler=reconciler;this.repository=repository;this.access=access;this.connections=connections;this.flags=flags;this.clock=clock;}
    private void enabled(){require(flags.enabled(),SERVICE_UNAVAILABLE,"conversations_disabled");}
    public Conversation find(AuthSessionUser a,String id){var c=repository.find(a.companyId(),id).orElseThrow(()->new ResponseStatusException(NOT_FOUND,"conversation_unavailable"));return c.withBlocked(c.outboundBlocked()||suppression.blocked(a.companyId(),c.phone()));}
    @Transactional(readOnly=true)
    public Page list(AuthSessionUser actor,String box,String search,int page,int size){
        enabled();var a=access.current(actor,false);access.tab(a);
        require(Set.of("MINE","UNASSIGNED","ALL","RESOLVED").contains(box)&&search.length()<=120&&page>=1&&page<=100000&&Set.of(10,25,50).contains(size),BAD_REQUEST,"conversation_invalid_filters");
        var conn=repository.connection(a.companyId()).orElseThrow(()->new ResponseStatusException(NOT_FOUND,"whatsapp_connection_missing"));
        var caps=access.capabilities(a,conn.id());require(!caps.isEmpty(),FORBIDDEN,"conversation_access_denied");
        if(box.equals("UNASSIGNED"))require(caps.contains(Capability.TAKE)&&caps.contains(Capability.READ_OWN),FORBIDDEN,"conversation_action_denied");
        var result=repository.list(a.companyId(),conn.id(),a.userCompanyId(),caps,box,search,page,size);return new Page(result.items().stream().map(c->c.withBlocked(c.outboundBlocked()||suppression.blocked(a.companyId(),c.phone()))).toList(),result.total(),result.page(),result.pageSize(),result.cursor());
    }
    @Transactional(readOnly=true)
    public List<Member> eligibleMembers(AuthSessionUser actor,String id){
        enabled();var a=access.current(actor,false);var c=find(a,id);access.operate(a,c,Capability.TRANSFER,false);
        return repository.members(a.companyId(),c.connectionId()).stream().filter(Member::active).filter(m->{try{
            var target=connections.resolveMember(a.companyId(),m.membershipId());var caps=access.capabilities(target,c.connectionId());return caps.contains(Capability.READ_OWN)&&caps.contains(Capability.TAKE);
        }catch(ResponseStatusException denied){return false;}}).map(m->new Member(m.membershipId(),m.name(),Set.of(),true,m.version())).toList();
    }
    @Transactional(readOnly=true)
    public Timeline timeline(AuthSessionUser actor,String id,long after,Instant before){
        enabled();require(after>=0,BAD_REQUEST,"conversation_invalid_cursor");var a=access.current(actor,false);var c=find(a,id);var caps=access.read(a,c);
        var events=repository.events(a.companyId(),id,after);
        long through=after>0&&events.size()==100?events.getLast().seq():c.changeSeq();
        var messages=repository.messages(a.companyId(),id,after,through,before);var notes=repository.notes(a.companyId(),id,after,through);boolean earlier=messages.size()>100||after==0&&(notes.size()==100||events.size()==100);
        return new Timeline(c,messages.stream().limit(100).map(m->m.withAttachments(attachments.views(a.companyId(),id,m.id()))).toList(),notes,events,through,earlier,caps);
    }
    @Transactional(readOnly=true)
    public History history(AuthSessionUser actor,String id,String beforeMessage,String beforeNote,Long beforeEvent){
        enabled();var a=access.current(actor,false);var c=find(a,id);access.read(a,c);
        if(beforeMessage!=null)uuid(beforeMessage);if(beforeNote!=null)uuid(beforeNote);require(beforeEvent==null||beforeEvent>0,BAD_REQUEST,"conversation_invalid_cursor");
        var messages=repository.olderMessages(a.companyId(),id,beforeMessage);var notes=repository.olderNotes(a.companyId(),id,beforeNote);var events=repository.olderEvents(a.companyId(),id,beforeEvent);
        return new History(messages.stream().limit(100).map(m->m.withAttachments(attachments.views(a.companyId(),id,m.id()))).toList(),notes.stream().limit(100).toList(),events.stream().limit(100).toList(),messages.size()>100||notes.size()>100||events.size()>100);
    }
    @Transactional
    public Receipt command(AuthSessionUser actor,String id,Command input){
        enabled();uuid(input.requestKey());repository.lock(actor.companyId());var a=access.current(actor,true);var c=find(a,id);
        if(input.action().equals("TAKE")){reconciler.reconcile(a.companyId(),c.connectionId());c=find(a,id);var caps=access.capabilities(a,c.connectionId());require(caps.contains(Capability.TAKE)&&caps.contains(Capability.READ_OWN),FORBIDDEN,"conversation_action_denied");}
        else access.read(a,c);
        String fingerprint=hash(repository.encode(List.of(id,input)));var replay=repository.receipt(a.companyId(),a.userCompanyId(),input.requestKey(),fingerprint);
        if(replay.isPresent())return replay.get();version(input.version(),c.version());
        Long target=null;
        switch(input.action()){
            case "TAKE"->{target=a.userCompanyId();require(repository.assignment(a.companyId(),id,input.version(),target,true)==1,CONFLICT,"conversation_already_assigned");}
            case "TRANSFER"->{access.operate(a,c,Capability.TRANSFER,false);require(c.assigneeMembershipId()!=null,BAD_REQUEST,"conversation_take_first");
                require(input.targetMembershipId()!=null,BAD_REQUEST,"conversation_member_required");
                var receiver=connections.resolveMember(a.companyId(),input.targetMembershipId());var caps=access.capabilities(receiver,c.connectionId());
                require(caps.contains(Capability.READ_OWN)&&caps.contains(Capability.TAKE),BAD_REQUEST,"conversation_member_unavailable");target=receiver.userCompanyId();
                require(repository.assignment(a.companyId(),id,c.version(),target,false)==1,CONFLICT,"conversation_version_conflict");}
            case "RESOLVE","REOPEN"->{access.operate(a,c,Capability.RESOLVE,!access.capabilities(a,c.connectionId()).contains(Capability.READ_ALL));
                require(!c.status().equals(input.action().equals("RESOLVE")?"RESOLVED":"OPEN"),CONFLICT,"conversation_version_conflict");
                repository.state(a.companyId(),id,input.action().equals("RESOLVE")?"RESOLVED":"OPEN");}
            case "OPT_OUT"->{access.operate(a,c,Capability.REPLY,true);repository.optOut(a.companyId(),id);suppression.recordOptOut(a,c.phone());}
            case "READ"->{require(input.readSeq()!=null&&input.readSeq()<=c.changeSeq(),BAD_REQUEST,"conversation_invalid_cursor");repository.read(a.companyId(),id,a.userCompanyId(),input.readSeq());}
            default->throw new ResponseStatusException(BAD_REQUEST,"conversation_invalid_action");
        }
        long activity=repository.transition(a.companyId(),c.connectionId(),id,a.userCompanyId(),input.action(),target,input.requestKey(),c.assigneeMembershipId(),c.status(),find(a,id).status());
        if(Set.of("TAKE","TRANSFER","REOPEN").contains(input.action()))notices.enqueue(a.companyId(),id,activity);
        var result=new Receipt(id,find(a,id).version(),input.action());repository.receipt(a.companyId(),a.userCompanyId(),input.requestKey(),id,fingerprint,result);return result;
    }
    @Transactional
    public Receipt text(AuthSessionUser actor,String id,Text input,boolean note){
        enabled();uuid(input.requestKey());require((!input.body().isBlank()||!note&&input.attachmentIds()!=null&&!input.attachmentIds().isEmpty())&&input.body().length()<=4000,BAD_REQUEST,"conversation_text_required");
        require(!note||input.attachmentIds()==null||input.attachmentIds().isEmpty(),BAD_REQUEST,"conversation_note_attachments_denied");
        require(input.attachmentIds()==null||input.attachmentIds().isEmpty()||input.attachmentIds().size()==1&&input.body().length()<=1000,BAD_REQUEST,"conversation_attachment_caption_limit");
        repository.lock(actor.companyId());var a=access.current(actor,true);var c=find(a,id);access.operate(a,c,note?Capability.NOTE:Capability.REPLY,!note);
        String fingerprint=hash(repository.encode(List.of(id,note,input)));var replay=repository.receipt(a.companyId(),a.userCompanyId(),input.requestKey(),fingerprint);if(replay.isPresent())return replay.get();
        version(input.version(),c.version());var key=UUID.randomUUID().toString();
        if(note){long seq=repository.event(a.companyId(),c.connectionId(),id,a.userCompanyId(),"INTERNAL_NOTE",null,input.requestKey());repository.note(a.companyId(),key,id,a.userCompanyId(),input.body(),seq);}
        else {
            require(!c.outboundBlocked(),CONFLICT,"whatsapp_recipient_opted_out");
            require(flags.outboundEnabled(),SERVICE_UNAVAILABLE,"whatsapp_outbound_disabled");require(c.status().equals("OPEN"),CONFLICT,"conversation_resolved");
            require(inWindow(c.lastInboundAt(),clock.instant()),CONFLICT,"whatsapp_customer_window_closed");
            var conn=repository.connection(a.companyId(),c.connectionId()).orElseThrow();
            require(conn.status().equals("CONNECTED")&&conn.verifiedAt()!=null,CONFLICT,"whatsapp_connection_unavailable");
            long seq=repository.event(a.companyId(),c.connectionId(),id,a.userCompanyId(),"MESSAGE_QUEUED",null,input.requestKey());
            repository.enqueue(a.companyId(),key,c,a.userCompanyId(),input.body(),seq);
            String type=attachments.bind(a,c,key,input.attachmentIds());repository.messageType(a.companyId(),key,type);
        }
        var result=new Receipt(key,find(a,id).version(),note?"INTERNAL_NOTE":"QUEUED");repository.receipt(a.companyId(),a.userCompanyId(),input.requestKey(),id,fingerprint,result);return result;
    }
    public static boolean inWindow(Instant last,Instant now){return last!=null&&!last.isAfter(now.plusSeconds(60))&&last.plus(Duration.ofHours(24)).isAfter(now);}
    public static String hash(String value){return hash(value.getBytes(StandardCharsets.UTF_8));}
    public static String hash(byte[] value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value));}catch(Exception e){throw new IllegalStateException();}}
    public static void uuid(String key){try{require(key!=null&&UUID.fromString(key).toString().equalsIgnoreCase(key),BAD_REQUEST,"conversation_invalid_request");}catch(IllegalArgumentException e){throw new ResponseStatusException(BAD_REQUEST,"conversation_invalid_request");}}
    private static void version(long expected,long actual){require(expected==actual,CONFLICT,"conversation_version_conflict");}
}
