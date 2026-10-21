package com.indice.erp.scheduling;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.SalesClientDirectoryService;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Atomic private client capture. Sales owns the client; Scheduling owns only its retry receipt. */
@Service
public class SchedulingClientCaptureService {
    public record Request(@NotBlank @Size(max=180) String name,@NotBlank @Email @Size(max=240) String email,
        @Size(max=40) String phone,@Size(max=180) String companyName,@AssertTrue boolean contactConsent) { }
    private final SchedulingRepository repository;
    private final SalesClientDirectoryService clients;
    private final com.indice.erp.access.module.ModuleAccessService modules;
    private final com.fasterxml.jackson.databind.ObjectMapper mapper;
    public SchedulingClientCaptureService(SchedulingRepository repository,SalesClientDirectoryService clients,com.indice.erp.access.module.ModuleAccessService modules,com.fasterxml.jackson.databind.ObjectMapper mapper){this.repository=repository;this.clients=clients;this.modules=modules;this.mapper=mapper;}
    @Transactional
    public SalesClientDirectoryService.Client create(AuthSessionUser actor,Request body,String key){
        SchedulingAccessService.requireAdministrator(actor);
        if(key==null||!key.matches("[a-zA-Z0-9-]{16,80}"))throw new IllegalArgumentException();
        repository.lockCompany(actor.companyId());
        if(!modules.companyCanAccessForMutation(actor.companyId(),"scheduling")||!clients.canSelect(actor))throw new SecurityException();
        if(!body.contactConsent()||body.name().isBlank())throw new IllegalArgumentException();
        String fingerprint;try{fingerprint=SchedulingHash.digest(mapper.writeValueAsString(body));}catch(Exception e){throw new IllegalArgumentException();}
        var rows=repository.jdbc().query("SELECT fingerprint,client_id FROM scheduling_client_capture_replays WHERE company_id=? AND actor_user_id=? AND request_key=? FOR UPDATE",(r,n)->java.util.Map.entry(r.getString(1),r.getLong(2)),actor.companyId(),actor.userId(),key);
        if(!rows.isEmpty()){
            if(!rows.getFirst().getKey().equals(fingerprint))throw new IllegalStateException();
            return clients.selected(actor,rows.getFirst().getValue());
        }
        var client=clients.createForScheduling(actor,body.name(),body.email(),body.phone(),body.companyName());
        repository.jdbc().update("INSERT INTO scheduling_client_capture_replays(company_id,actor_user_id,request_key,fingerprint,client_id) VALUES(?,?,?,?,?)",actor.companyId(),actor.userId(),key,fingerprint,client.id());
        repository.audit(actor.companyId(),actor.userId(),"CLIENT",client.id(),"CLIENT_CREATED");
        return client;
    }
}
