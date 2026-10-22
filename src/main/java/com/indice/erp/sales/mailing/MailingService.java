package com.indice.erp.sales.mailing;

import com.indice.erp.auth.AuthSessionUser;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.sales.mailing.MailingContracts.*;

@Service
public class MailingService {
    private final JdbcTemplate db;
    private final com.indice.erp.email.accounts.EmailAccountService emailAccounts;
    private final com.indice.erp.access.module.ModuleAccessService modules;
    public MailingService(JdbcTemplate db,com.indice.erp.access.module.ModuleAccessService modules,com.indice.erp.email.accounts.EmailAccountService emailAccounts) { this.db=db;this.modules=modules;this.emailAccounts=emailAccounts; }
    private static void check(boolean valid,HttpStatus status,String code) {
        if(!valid)throw new ResponseStatusException(status,code);
    }
    private static void page(int page,int size,String search) {
        check(page>=1&&page<=10000&&Set.of(10,25,50,100,200).contains(size)&&search.length()<=180,
            HttpStatus.BAD_REQUEST,"mailing_filters_invalid");
    }
    private static String term(String value) { return "%"+value.replace("!","!!").replace("%","!%").replace("_","!_")+"%"; }
    public static boolean manager(AuthSessionUser actor) {
        return Set.of("root","superadmin","admin","owner","dueno").contains(actor.role().toLowerCase(Locale.ROOT));
    }
    @Transactional(readOnly=true)
    public CampaignPage list(AuthSessionUser actor,String search,int page,int size,String sort,String direction) {
        page(page,size,search);
        String column=switch(sort){case "name"->"c.name";case "subject"->"c.subject";case "updatedAt"->"c.updated_at";default->throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"mailing_sort_invalid");};
        check(Set.of("asc","desc").contains(direction),HttpStatus.BAD_REQUEST,"mailing_sort_invalid");
        String scope=" FROM sales_mailing_campaigns c WHERE c.company_id=? AND (c.name LIKE ? ESCAPE '!' OR c.subject LIKE ? ESCAPE '!')";
        String term=term(search);
        long total=db.queryForObject("SELECT COUNT(*)"+scope,Long.class,actor.companyId(),term,term);
        var ids=db.queryForList("SELECT c.id"+scope+" ORDER BY "+column+" "+direction+",c.id LIMIT ? OFFSET ?",String.class,actor.companyId(),term,term,size,(page-1)*size);
        return new CampaignPage(ids.stream().map(id->campaign(actor.companyId(),id,false)).toList(),total,page,size,manager(actor),true);
    }
    @Transactional(readOnly=true)
    public Campaign get(AuthSessionUser actor,String id) { return campaign(actor.companyId(),id,true); }
    private Campaign campaign(long company,String id,boolean detail) {
        var recipients=detail?recipients(company,id):List.<Contact>of();
        return db.query("""
            SELECT c.*,(SELECT COUNT(DISTINCT LOWER(TRIM(s.email))) FROM sales_mailing_recipients r
            JOIN sales_contacts s ON s.company_id=r.company_id AND s.id=r.contact_id
            WHERE r.company_id=c.company_id AND r.campaign_id=c.id AND s.deleted_at IS NULL
              AND s.status='active' AND s.email REGEXP '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') AS recipient_count
            FROM sales_mailing_campaigns c WHERE c.company_id=? AND c.id=?
            """,(r,n)->new Campaign(r.getString("id"),r.getString("name"),r.getString("subject"),r.getString("sender_name"),r.getString("reply_to"),r.getString("preview_text"),detail?r.getString("body_text"):"",r.getString("status"),r.getLong("version"),r.getLong("recipient_count"),r.getTimestamp("updated_at").toInstant(),recipients,r.getString("sender_account_id"),detail?r.getString("body_html"):null),company,id)
            .stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"mailing_not_found"));
    }
    private List<Contact> recipients(long company,String id) {
        return db.query("""
            SELECT s.id,COALESCE(NULLIF(TRIM(s.contact_person),''),s.company_name),s.email FROM sales_mailing_recipients r
            JOIN sales_contacts s ON s.id=r.contact_id AND s.company_id=r.company_id
            WHERE r.company_id=? AND r.campaign_id=? AND s.deleted_at IS NULL ORDER BY s.company_name,s.id
            """,(r,n)->new Contact(r.getLong(1),r.getString(2),Objects.toString(r.getString(3),"")),company,id);
    }
    @Transactional(readOnly=true)
    public ContactPage contacts(AuthSessionUser actor,String search,int page,int size) {
        page(page,size,search);String term=term(search);
        String scope=" FROM sales_contacts WHERE company_id=? AND deleted_at IS NULL AND status='active' AND (company_name LIKE ? ESCAPE '!' OR email LIKE ? ESCAPE '!')";
        var count=db.queryForObject("SELECT COUNT(*)"+scope,Long.class,actor.companyId(),term,term);
        var items=db.query("SELECT id,company_name,email"+scope+" ORDER BY company_name,id LIMIT ? OFFSET ?",(r,n)->new Contact(r.getLong(1),r.getString(2),Objects.toString(r.getString(3),"")),actor.companyId(),term,term,size,(page-1)*size);
        return new ContactPage(items,count,page,size);
    }
    @Transactional
    public Campaign save(AuthSessionUser actor,String id,DraftInput input) {
        check(manager(actor),HttpStatus.FORBIDDEN,"mailing_edit_forbidden");
        try { check(UUID.fromString(id).toString().equals(id),HttpStatus.BAD_REQUEST,"mailing_id_invalid"); }
        catch(IllegalArgumentException invalid){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"mailing_id_invalid");}
        // Serialize create and optimistic edits within this tenant, including network retries.
        db.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,actor.companyId());
        check(modules.companyCanAccessForMutation(actor.companyId(),"crm"),HttpStatus.FORBIDDEN,"mailing_module_unavailable");
        var versions=db.queryForList("SELECT version FROM sales_mailing_campaigns WHERE company_id=? AND id=? FOR UPDATE",Long.class,actor.companyId(),id);
        check(versions.isEmpty()?input.version()==0:versions.getFirst()==input.version(),HttpStatus.CONFLICT,"mailing_version_conflict");
        check(versions.isEmpty()||"DRAFT".equals(db.queryForObject("SELECT status FROM sales_mailing_campaigns WHERE company_id=? AND id=?",String.class,actor.companyId(),id)),HttpStatus.CONFLICT,"mailing_campaign_locked");
        String sender=input.senderAccountId()==null||input.senderAccountId().isBlank()?null:input.senderAccountId();
        if(sender!=null)emailAccounts.requireSender(actor,sender);
        var contacts=new LinkedHashSet<>(input.contactIds());
        for(long contact:contacts)check(Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM sales_contacts WHERE company_id=? AND id=? AND deleted_at IS NULL AND status='active')",Boolean.class,actor.companyId(),contact)),HttpStatus.BAD_REQUEST,"mailing_contact_unavailable");
        String html=input.bodyHtml()==null ? (versions.isEmpty()?null:campaign(actor.companyId(),id,true).bodyText().equals(input.bodyText())?campaign(actor.companyId(),id,true).bodyHtml():null) : com.indice.erp.email.mailbox.SafeMailHtml.clean(input.bodyHtml());
        if(versions.isEmpty())db.update("""
            INSERT INTO sales_mailing_campaigns(id,company_id,name,subject,sender_name,reply_to,preview_text,body_text,created_by,updated_by)
            VALUES(?,?,?,?,?,?,?,?,?,?)
            """,id,actor.companyId(),input.name().trim(),input.subject().trim(),input.senderName().trim(),input.replyTo().trim(),input.previewText().trim(),input.bodyText(),actor.userId(),actor.userId());
        else db.update("""
            UPDATE sales_mailing_campaigns SET name=?,subject=?,sender_name=?,reply_to=?,preview_text=?,body_text=?,version=version+1,updated_by=?,updated_at=CURRENT_TIMESTAMP(6)
            WHERE company_id=? AND id=? AND version=?
            """,input.name().trim(),input.subject().trim(),input.senderName().trim(),input.replyTo().trim(),input.previewText().trim(),input.bodyText(),actor.userId(),actor.companyId(),id,input.version());
        db.update("UPDATE sales_mailing_campaigns SET sender_account_id=?,body_html=? WHERE company_id=? AND id=?",sender,html,actor.companyId(),id);
        db.update("DELETE FROM sales_mailing_recipients WHERE company_id=? AND campaign_id=?",actor.companyId(),id);
        for(long contact:contacts)db.update("INSERT INTO sales_mailing_recipients(company_id,campaign_id,contact_id) VALUES(?,?,?)",actor.companyId(),id,contact);
        db.update("INSERT INTO sales_mailing_audit(company_id,campaign_id,actor_user_id,campaign_version,action) VALUES(?,?,?,?,'DRAFT_SAVED')",actor.companyId(),id,actor.userId(),input.version()+1);
        return campaign(actor.companyId(),id,true);
    }
}
