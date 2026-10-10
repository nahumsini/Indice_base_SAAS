package com.indice.erp.maintenance;

import com.indice.erp.auth.AuthSessionUser;
import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.maintenance.MaintenanceDtos.*;
import static com.indice.erp.maintenance.MaintenancePolicy.*;

@Service
public class MaintenanceTeamService {
    public record Technician(long id,String name,List<String> specialties,boolean active,long version) {}
    public record Update(@NotNull @Size(max=20) List<@NotBlank @Size(max=80) String> specialties,boolean active,@Min(0)long expectedVersion) {}
    private final MaintenanceRepository db;private final MaintenanceAccess access;
    public MaintenanceTeamService(MaintenanceRepository db,MaintenanceAccess access){this.db=db;this.access=access;}
    public Page<Technician> list(AuthSessionUser actor,String search,int page,int size){MaintenanceAccess.administrate(actor);var people=db.members(actor,search,page,size);return new Page<>(people.items().stream().map(person->{var rows=db.jdbc().query("SELECT * FROM maintenance_technicians WHERE company_id=? AND user_id=?",(r,n)->new Technician(person.id(),person.name(),db.parse(r.getString("specialties"),new TypeReference<List<String>>(){}),r.getBoolean("active"),r.getLong("version")),actor.companyId(),person.id());return rows.isEmpty()?new Technician(person.id(),person.name(),List.of(),true,0):rows.getFirst();}).toList(),people.total(),page,size);}
    @Transactional public Technician update(AuthSessionUser actor,long user,Update input){
        actor=access.lock(actor,"configuration");MaintenanceAccess.administrate(actor);var f=access.filter(actor,"wp","ASSET");var args=new ArrayList<Object>(List.of(actor.companyId(),user));args.addAll(f.args());
        var name=db.one(db.jdbc().query("SELECT u.full_name FROM user_companies uc JOIN users u ON u.id=uc.user_id LEFT JOIN user_work_profiles wp ON wp.company_id=uc.company_id AND wp.user_company_id=uc.id WHERE uc.company_id=? AND uc.user_id=? AND uc.status='active'"+f.sql(),(r,n)->r.getString(1),args.toArray()));
        var prior=db.jdbc().queryForList("SELECT version FROM maintenance_technicians WHERE company_id=? AND user_id=?",Long.class,actor.companyId(),user);version(prior.isEmpty()?0:prior.getFirst(),input.expectedVersion());
        require(new HashSet<>(db.settings(actor.companyId()).specialties()).containsAll(input.specialties())&&input.specialties().stream().distinct().count()==input.specialties().size(),"maintenance_specialty_invalid");
        db.jdbc().update("INSERT INTO maintenance_technicians(company_id,user_id,specialties,active,version) VALUES(?,?,?,?,1) ON DUPLICATE KEY UPDATE specialties=VALUES(specialties),active=VALUES(active),version=version+1",actor.companyId(),user,db.json(input.specialties()),input.active());db.audit(actor,"TECHNICIAN",user,"TECHNICIAN_UPDATED","");return new Technician(user,name,input.specialties(),input.active(),input.expectedVersion()+1);
    }
}
