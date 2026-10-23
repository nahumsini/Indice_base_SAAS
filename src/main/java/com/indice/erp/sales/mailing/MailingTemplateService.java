package com.indice.erp.sales.mailing;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.sales.mailing.MailingTemplateContracts.*;

@Service
public class MailingTemplateService {
    private final JdbcTemplate db;
    private final ModuleAccessService modules;
    private final MailingFileService files;
    private final com.fasterxml.jackson.databind.ObjectMapper mapper;
    public MailingTemplateService(JdbcTemplate db,ModuleAccessService modules,MailingFileService files,com.fasterxml.jackson.databind.ObjectMapper mapper) {
        this.db=db;this.files=files;this.mapper=mapper;
        this.modules=modules;
    }
    private static void require(boolean valid,HttpStatus status,String code) {
        if (!valid) throw new ResponseStatusException(status,code);
    }
    private static void uuid(String id) {
        try { require(UUID.fromString(id).toString().equals(id),HttpStatus.BAD_REQUEST,"mailing_template_id_invalid"); }
        catch (IllegalArgumentException invalid) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"mailing_template_id_invalid"); }
    }
    @Transactional(readOnly=true)
    public TemplatePage list(AuthSessionUser actor,String search,String status,int page,int size,String sort,String direction) {
        require(search.length()<=180 && page>=1 && page<=10000 && Set.of(10,25,50,100,200).contains(size),HttpStatus.BAD_REQUEST,"mailing_template_filters_invalid");
        require(Set.of("ACTIVE","ARCHIVED","ALL").contains(status) && Set.of("asc","desc").contains(direction),HttpStatus.BAD_REQUEST,"mailing_template_filters_invalid");
        String column=switch(sort) {
            case "name" -> "name";
            case "subject" -> "subject";
            case "updatedAt" -> "updated_at";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"mailing_template_sort_invalid");
        };
        String scope=" FROM sales_mailing_templates WHERE company_id=? AND (name LIKE ? ESCAPE '!' OR subject LIKE ? ESCAPE '!')";
        String term="%"+search.replace("!","!!").replace("%","!%").replace("_","!_")+"%";
        var args=new ArrayList<Object>(List.of(actor.companyId(),term,term));
        if (!status.equals("ALL")) { scope+=" AND status=?"; args.add(status); }
        long total=db.queryForObject("SELECT COUNT(*)"+scope,Long.class,args.toArray());
        args.add(size); args.add((page-1)*size);
        var items=db.query("SELECT id,name,subject,preview_text,status,version,updated_at"+scope+" ORDER BY "+column+" "+direction+",id LIMIT ? OFFSET ?",
            (r,n)->new Template(r.getString("id"),r.getString("name"),r.getString("subject"),r.getString("preview_text"),"",r.getString("status"),r.getLong("version"),r.getTimestamp("updated_at").toInstant()),args.toArray());
        return new TemplatePage(items,total,page,size,MailingService.manager(actor));
    }
    @Transactional(readOnly=true)
    public Template get(AuthSessionUser actor,String id) { return get(actor.companyId(),id); }
    private Template get(long company,String id) {
        uuid(id);
        return db.query("SELECT * FROM sales_mailing_templates WHERE company_id=? AND id=?",
            (r,n)->new Template(r.getString("id"),r.getString("name"),r.getString("subject"),r.getString("preview_text"),r.getString("body_text"),r.getString("status"),r.getLong("version"),r.getTimestamp("updated_at").toInstant(),r.getString("body_html"),files.template(company,id)),company,id)
            .stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"mailing_template_not_found"));
    }
    private void lock(AuthSessionUser actor) {
        require(MailingService.manager(actor),HttpStatus.FORBIDDEN,"mailing_template_edit_forbidden");
        db.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,actor.companyId());
        require(modules.companyCanAccessForMutation(actor.companyId(),"crm"),HttpStatus.FORBIDDEN,"mailing_module_unavailable");
    }
    private void audit(AuthSessionUser actor,String id,long version,String action) {
        db.update("INSERT INTO sales_mailing_template_audit(company_id,template_id,actor_user_id,template_version,action) VALUES(?,?,?,?,?)",
            actor.companyId(),id,actor.userId(),version,action);
    }
    @Transactional
    public Template save(AuthSessionUser actor,String id,TemplateInput input) {
        uuid(id); lock(actor);
        var versions=db.queryForList("SELECT version FROM sales_mailing_templates WHERE company_id=? AND id=? FOR UPDATE",Long.class,actor.companyId(),id);
        String requestHash=null;
        if(input.requestId()!=null){
            uuid(input.requestId());
            try{requestHash=com.indice.erp.billing.BillingHashing.sha256(mapper.writeValueAsString(input));}
            catch(com.fasterxml.jackson.core.JsonProcessingException invalid){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"mailing_template_invalid");}
            var replay=db.queryForList("SELECT save_request_hash FROM sales_mailing_templates WHERE company_id=? AND id=? AND save_request_id=?",String.class,actor.companyId(),id,input.requestId());
            if(!replay.isEmpty()){
                require(Objects.equals(requestHash,replay.getFirst()),HttpStatus.CONFLICT,"mailing_template_version_conflict");
                return get(actor.companyId(),id);
            }
        }
        require(versions.isEmpty()?input.version()==0:versions.getFirst()==input.version(),HttpStatus.CONFLICT,"mailing_template_version_conflict");
        if(input.attachmentIds()!=null)files.validate(actor,input.attachmentIds());
        String html=input.bodyHtml()==null ? (versions.isEmpty()?null:get(actor.companyId(),id).bodyText().equals(input.bodyText())?get(actor.companyId(),id).bodyHtml():null) : com.indice.erp.email.mailbox.SafeMailHtml.clean(input.bodyHtml());
        if (versions.isEmpty()) {
            db.update("""
                INSERT INTO sales_mailing_templates(company_id,id,name,subject,preview_text,body_text,created_by,updated_by)
                VALUES(?,?,?,?,?,?,?,?)
                """,actor.companyId(),id,input.name().trim(),input.subject().trim(),input.previewText().trim(),input.bodyText(),actor.userId(),actor.userId());
        } else {
            db.update("""
                UPDATE sales_mailing_templates SET name=?,subject=?,preview_text=?,body_text=?,version=version+1,
                updated_by=?,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=? AND version=?
                """,input.name().trim(),input.subject().trim(),input.previewText().trim(),input.bodyText(),actor.userId(),actor.companyId(),id,input.version());
        }
        db.update("UPDATE sales_mailing_templates SET body_html=? WHERE company_id=? AND id=?",html,actor.companyId(),id);
        files.replace(actor,id,input.attachmentIds(),true);
        db.update("UPDATE sales_mailing_templates SET save_request_id=?,save_request_hash=? WHERE company_id=? AND id=?",input.requestId(),requestHash,actor.companyId(),id);
        audit(actor,id,input.version()+1,"TEMPLATE_SAVED");
        return get(actor.companyId(),id);
    }
    @Transactional
    public Template status(AuthSessionUser actor,String id,TemplateStatus input) {
        uuid(id); lock(actor);
        var existing=get(actor.companyId(),id);
        require(existing.version()==input.version(),HttpStatus.CONFLICT,"mailing_template_version_conflict");
        require(Set.of("ACTIVE","ARCHIVED").contains(input.status()),HttpStatus.BAD_REQUEST,"mailing_template_status_invalid");
        db.update("UPDATE sales_mailing_templates SET status=?,version=version+1,save_request_id=NULL,save_request_hash=NULL,updated_by=?,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=? AND version=?",
            input.status(),actor.userId(),actor.companyId(),id,input.version());
        audit(actor,id,input.version()+1,"TEMPLATE_"+input.status());
        return get(actor.companyId(),id);
    }
}
