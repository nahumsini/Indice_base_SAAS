package com.indice.erp.sales.conversations.whatsapp;

import static com.indice.erp.sales.conversations.SalesConversationDtos.*;
import static com.indice.erp.sales.conversations.SalesConversationAccess.require;
import static org.springframework.http.HttpStatus.*;
import com.indice.erp.auth.*;
import com.indice.erp.sales.conversations.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WhatsAppConnectionService {
    private final SalesConversationRepository repository;private final SalesConversationAccess access;
    private final SalesConversationAccessReconciler reconciler;
    private final SessionAuthService auth;private final WhatsAppProperties flags;
    public WhatsAppConnectionService(SalesConversationRepository repository,SalesConversationAccess access,SessionAuthService auth,WhatsAppProperties flags,SalesConversationAccessReconciler reconciler){this.reconciler=reconciler;this.repository=repository;this.access=access;this.auth=auth;this.flags=flags;}
    public Context context(AuthSessionUser requested){
        var a=access.current(requested,false);var conn=repository.connection(a.companyId()).orElse(null);
        require(conn==null||access.scopeAvailable(a.companyId(),new SalesConversationAccess.Scope(conn.unitId(),conn.businessId()))&&access.scope(a).contains(new SalesConversationAccess.Scope(conn.unitId(),conn.businessId())),FORBIDDEN,"conversation_scope_denied");
        boolean manage;try{access.manager(a);manage=true;}catch(org.springframework.web.server.ResponseStatusException e){manage=false;}
        Set<Capability> caps=Set.of();try{access.tab(a);if(conn!=null)caps=access.capabilities(a,conn.id());}catch(org.springframework.web.server.ResponseStatusException e){if(!manage)throw e;}
        require(manage||!caps.isEmpty(),FORBIDDEN,"conversation_access_denied");
        return new Context(flags.enabled(),flags.ingressEnabled(),flags.outboundEnabled(),conn,caps,manage,a.userCompanyId());
    }
    @Transactional
    public Connection setup(AuthSessionUser requested,String requestKey){
        require(flags.enabled(),SERVICE_UNAVAILABLE,"conversations_disabled");SalesConversationService.uuid(requestKey);
        var a=access.current(requested,true);access.manager(a);repository.lock(a.companyId());
        var existing=repository.connection(a.companyId());
        if(existing.isPresent()){require(existing.get().id().equals(requestKey),CONFLICT,"whatsapp_single_number_required");return existing.get();}
        repository.setup(a.companyId(),requestKey,flags.appId(),a.userCompanyId(),access.scope(a));
        repository.event(a.companyId(),requestKey,null,a.userCompanyId(),"CONNECTION_SETUP_REQUESTED",null,requestKey);
        return repository.connection(a.companyId(),requestKey).orElseThrow();
    }
    public List<Member> members(AuthSessionUser requested,String connection){
        var a=access.current(requested,false);access.manager(a);connectionScope(a,connection);
        return repository.members(a.companyId(),connection);
    }
    public List<Member> candidates(AuthSessionUser requested,String connection){
        var a=access.current(requested,false);access.manager(a);var c=connectionScope(a,connection);var ownScope=access.scope(a);
        return repository.activeMembers(a.companyId()).stream().filter(m->{try{var target=resolveMember(a.companyId(),m.membershipId());access.tab(target);
            return ownScope.contains(access.scope(target))&&access.scope(target).contains(new SalesConversationAccess.Scope(c.unitId(),c.businessId()));
        }catch(org.springframework.web.server.ResponseStatusException denied){return false;}}).toList();
    }
    private Connection connectionScope(AuthSessionUser a,String id){
        var c=repository.connection(a.companyId(),id).orElseThrow(()->new org.springframework.web.server.ResponseStatusException(NOT_FOUND));
        require(access.scope(a).contains(new SalesConversationAccess.Scope(c.unitId(),c.businessId())),FORBIDDEN,"conversation_scope_denied");return c;
    }
    @Transactional
    public List<Member> grant(AuthSessionUser requested,String connection,long member,Grant input){
        require(flags.enabled(),SERVICE_UNAVAILABLE,"conversations_disabled");var a=access.current(requested,true);access.manager(a);
        repository.lock(a.companyId());var conn=connectionScope(a,connection);
        var target=repository.members(a.companyId(),connection).stream().filter(m->m.membershipId()==member).findFirst();
        require(input.version()==target.map(Member::version).orElse(0L),CONFLICT,"conversation_version_conflict");
        if(!input.active()){
            require(target.isPresent(),NOT_FOUND,"conversation_member_unavailable");repository.revoke(a.companyId(),connection,member);reconciler.reconcile(a.companyId(),connection);
            repository.event(a.companyId(),connection,null,a.userCompanyId(),"MEMBER_REVOKED",member,null);return repository.members(a.companyId(),connection);
        }
        var receiver=resolveMember(a.companyId(),member);access.tab(receiver);
        require(access.scope(a).contains(access.scope(receiver))&&access.scope(receiver).contains(new SalesConversationAccess.Scope(conn.unitId(),conn.businessId())),FORBIDDEN,"conversation_scope_denied");
        var own=access.capabilities(a,connection);
        boolean bootstrap=repository.members(a.companyId(),connection).stream().noneMatch(Member::active)&&Objects.equals(a.userCompanyId(),member);
        require(bootstrap||own.containsAll(input.capabilities()),FORBIDDEN,"conversation_delegation_ceiling");
        require(input.capabilities().contains(Capability.READ_OWN)||input.capabilities().contains(Capability.READ_ALL)||input.capabilities().isEmpty(),BAD_REQUEST,"conversation_invalid_capabilities");
        require(!input.capabilities().contains(Capability.TAKE)||input.capabilities().contains(Capability.READ_OWN),BAD_REQUEST,"conversation_invalid_capabilities");
        repository.grant(a.companyId(),connection,member,input,access.scope(receiver));
        repository.event(a.companyId(),connection,null,a.userCompanyId(),bootstrap?"MEMBER_ACCESS_BOOTSTRAPPED":"MEMBER_GRANTED",member,null);
        return repository.members(a.companyId(),connection);
    }
    public AuthSessionUser resolveMember(long company,long membership){
        // Native session access revalidates membership, company status and user identity; no global-user grants.
        return repositoryMember(company,membership);
    }
    private AuthSessionUser repositoryMember(long company,long membership){
        return repository.activeMember(company,membership).flatMap(user->auth.scheduledActor(user,company))
            .filter(a->Objects.equals(a.userCompanyId(),membership)).orElseThrow(SalesConversationAccess::denied);
    }
}
