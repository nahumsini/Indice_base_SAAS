package com.indice.erp.sales.conversations;

import static com.indice.erp.sales.conversations.SalesConversationDtos.*;
import static com.indice.erp.sales.conversations.SalesConversationAccess.require;
import static org.springframework.http.HttpStatus.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.SalesConversationCrmContract;
import com.indice.erp.processTasks.tasks.ProcessTaskSalesContract;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** One whole-use-case transaction covers owner creation, linking and the idempotent receipt. */
@Service
public class SalesConversationOwnerBridge {
    public record Link(@NotBlank String requestKey,@PositiveOrZero long version,Long contactId,Long opportunityId) { }
    public record ContactInput(@NotBlank String requestKey,@PositiveOrZero long version,@NotBlank @Size(max=180)String name,@Size(max=220)String companyName,@Email @Size(max=220)String email) { @Override public String toString(){return "ContactInput[redacted]";} }
    public record OpportunityInput(@NotBlank String requestKey,@PositiveOrZero long version,@Positive long contactId,@NotBlank @Size(max=220)String name,Long flowId,@Size(max=80)String stage,@NotNull @Pattern(regexp="[A-Z]{3}")String currency,@NotNull @DecimalMin("0") @Digits(integer=12,fraction=2)BigDecimal amount) { @Override public String toString(){return "OpportunityInput[redacted]";} }
    public record TaskInput(@NotBlank String requestKey,@PositiveOrZero long version,@Positive long assigneeMembershipId,@NotBlank @Size(max=220)String title,@NotNull LocalDate dueDate) { @Override public String toString(){return "TaskInput[redacted]";} }
    public record CrmContext(boolean canReadContacts,boolean canReadOpportunities,SalesConversationCrmContract.Contact contact,SalesConversationCrmContract.Opportunity opportunity,List<SalesConversationCrmContract.Contact> candidates,List<SalesConversationCrmContract.Opportunity> opportunities,SalesConversationCrmContract.Flows flows) { @Override public String toString(){return "CrmContext[redacted]";} }
    public record TaskContext(boolean allowed,List<ProcessTaskSalesContract.Assignee> assignees,List<ProcessTaskSalesContract.Task> tasks) { @Override public String toString(){return "TaskContext[redacted]";} }
    private final com.indice.erp.sales.conversations.whatsapp.WhatsAppProperties flags;
    private final SalesConversationAccess access;private final SalesConversationRepository repository;private final SalesConversationCrmContract crm;private final ProcessTaskSalesContract tasks;
    public SalesConversationOwnerBridge(SalesConversationAccess access,SalesConversationRepository repository,SalesConversationCrmContract crm,ProcessTaskSalesContract tasks,com.indice.erp.sales.conversations.whatsapp.WhatsAppProperties flags){this.flags=flags;this.access=access;this.repository=repository;this.crm=crm;this.tasks=tasks;}
    private Conversation chat(AuthSessionUser a,String id){require(flags.enabled(),SERVICE_UNAVAILABLE,"conversations_disabled");var c=repository.find(a.companyId(),id).orElseThrow(()->new ResponseStatusException(NOT_FOUND));access.read(a,c);return c;}
    private SalesConversationCrmContract.Scope scope(AuthSessionUser a,Conversation c){var conn=repository.connection(a.companyId(),c.connectionId()).orElseThrow();return new SalesConversationCrmContract.Scope(conn.unitId(),conn.businessId());}
    @Transactional(readOnly=true)
    public CrmContext crm(AuthSessionUser actor,String id,String search){var a=access.current(actor,false);var c=chat(a,id);var s=scope(a,c);boolean contacts=crm.contactsAllowed(a),opportunities=crm.opportunitiesAllowed(a);
        return new CrmContext(contacts,opportunities,contacts&&c.contactId()!=null?selectedContact(a,s,c.contactId()):null,opportunities&&c.opportunityId()!=null?selectedOpportunity(a,s,c.opportunityId()):null,contacts?crm.contacts(a,s,search,c.phone()):List.of(),opportunities?crm.opportunities(a,s,c.contactId(),search):List.of(),opportunities?crm.flows(a):new SalesConversationCrmContract.Flows(List.of()));
    }
    private SalesConversationCrmContract.Contact selectedContact(AuthSessionUser a,SalesConversationCrmContract.Scope s,long id){try{return crm.contact(a,s,id);}catch(NoSuchElementException unavailable){return null;}}
    private SalesConversationCrmContract.Opportunity selectedOpportunity(AuthSessionUser a,SalesConversationCrmContract.Scope s,long id){try{return crm.opportunity(a,s,id);}catch(NoSuchElementException unavailable){return null;}}
    @Transactional(readOnly=true)
    public TaskContext tasks(AuthSessionUser actor,String id){var a=access.current(actor,false);var c=chat(a,id);var s=scope(a,c);boolean allowed=tasks.allowed(a)&&access.read(a,c).contains(Capability.TASK);
        var links=new ArrayList<ProcessTaskSalesContract.Task>();if(allowed)for(Long task:repository.taskIds(a.companyId(),id)){try{links.add(tasks.read(a,task));}catch(SecurityException|NoSuchElementException denied){}}
        return new TaskContext(allowed,allowed?tasks.candidates(a,s.unitId(),s.businessId()):List.of(),links);
    }
    @Transactional public Receipt link(AuthSessionUser actor,String id,Link input){return mutate(actor,id,input.requestKey(),input.version(),"LINK",input,Capability.LINK,(a,c)->{
        var s=scope(a,c);Long contact=input.contactId();
        if(contact!=null)crm.contact(a,s,contact);
        if(input.opportunityId()!=null){var opportunity=crm.opportunity(a,s,input.opportunityId());if(contact==null&&opportunity.contactId()>0){contact=opportunity.contactId();crm.contact(a,s,contact);}require(opportunity.contactId()==0||Objects.equals(contact,opportunity.contactId()),BAD_REQUEST,"conversation_contact_mismatch");}
        repository.crmLink(a.companyId(),id,contact,input.opportunityId());return new Receipt(id,c.version()+1,"LINKED");
    });}
    @Transactional public Receipt contact(AuthSessionUser actor,String id,ContactInput input){return mutate(actor,id,input.requestKey(),input.version(),"CREATE_CONTACT",input,Capability.LINK,(a,c)->{
        require(c.contactId()==null&&c.opportunityId()==null,CONFLICT,"conversation_already_linked");var result=crm.createContact(a,scope(a,c),input.name(),input.companyName(),input.email(),c.phone());repository.crmLink(a.companyId(),id,result.id(),null);return new Receipt(Long.toString(result.id()),c.version()+1,"CONTACT_CREATED");
    });}
    @Transactional public Receipt opportunity(AuthSessionUser actor,String id,OpportunityInput input){return mutate(actor,id,input.requestKey(),input.version(),"CREATE_OPPORTUNITY",input,Capability.LINK,(a,c)->{
        require(c.opportunityId()==null,CONFLICT,"conversation_already_linked");require(c.contactId()==null||c.contactId()==input.contactId(),BAD_REQUEST,"conversation_contact_mismatch");
        var result=crm.createOpportunity(a,scope(a,c),input.contactId(),input.name(),input.flowId(),input.stage(),input.currency(),input.amount());repository.crmLink(a.companyId(),id,input.contactId(),result.id());return new Receipt(Long.toString(result.id()),c.version()+1,"OPPORTUNITY_CREATED");
    });}
    @Transactional public Receipt task(AuthSessionUser actor,String id,TaskInput input){return mutate(actor,id,input.requestKey(),input.version(),"CREATE_TASK",input,Capability.TASK,(a,c)->{
        var s=scope(a,c);var result=tasks.create(a,input.assigneeMembershipId(),s.unitId(),s.businessId(),input.title(),input.dueDate(),"/sales/conversations?conversation="+id);repository.taskLink(a.companyId(),id,result.id(),a.userCompanyId());return new Receipt(Long.toString(result.id()),c.version(),"TASK_CREATED");
    });}
    private Receipt mutate(AuthSessionUser actor,String id,String key,long version,String action,Object input,Capability cap,java.util.function.BiFunction<AuthSessionUser,Conversation,Receipt> operation){
        SalesConversationService.uuid(key);repository.lock(actor.companyId());var a=access.current(actor,true);var c=chat(a,id);access.operate(a,c,cap,false);
        String fingerprint=SalesConversationService.hash(repository.encode(List.of(id,action,input)));var existing=repository.receipt(a.companyId(),a.userCompanyId(),key,fingerprint);if(existing.isPresent())return existing.get();require(c.version()==version,CONFLICT,"conversation_version_conflict");
        Receipt result;try{result=operation.apply(a,c);}catch(SecurityException denied){throw new ResponseStatusException(FORBIDDEN,"conversation_owner_permission_required");}catch(NoSuchElementException invalid){throw new ResponseStatusException(NOT_FOUND,"conversation_owner_record_unavailable");}
        repository.event(a.companyId(),c.connectionId(),id,a.userCompanyId(),action,null,key);repository.receipt(a.companyId(),a.userCompanyId(),key,id,fingerprint,result);return result;
    }
}
