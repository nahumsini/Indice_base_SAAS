package com.indice.erp.sales.mailing;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import static com.indice.erp.sales.mailing.MailingAudienceContracts.*;
import static com.indice.erp.sales.mailing.MailingDeliveryAccess.require;
import static org.springframework.http.HttpStatus.*;

/** Sales-owned audience projection. Lists store membership, never consent or copied contact authority. */
@Service
public class MailingAudienceService {
    private final JdbcTemplate db;
    private final MailingDeliveryAccess access;
    private final ModuleAccessService modules;
    public MailingAudienceService(JdbcTemplate db, MailingDeliveryAccess access, ModuleAccessService modules) {
        this.db=db; this.access=access; this.modules=modules;
    }
    private static final String FROM = " FROM sales_contacts s LEFT JOIN sales_mailing_permissions p ON p.company_id=s.company_id AND p.email=LOWER(TRIM(s.email)) ";
    private static final String VALID = "s.deleted_at IS NULL AND s.status='active'";
    private static final String ELIGIBILITY = "CASE WHEN s.deleted_at IS NOT NULL OR s.status<>'active' OR s.email IS NULL OR s.email NOT REGEXP '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN 'INVALID' WHEN p.status='SUPPRESSED' THEN 'SUPPRESSED' ELSE 'READY' END";
    private static final String FIELDS = "s.id,s.company_name,s.contact_person,s.email,s.owner_name,s.source,"+ELIGIBILITY+" AS eligibility";
    private static String clean(String s) { return s==null?"":s.trim(); }
    private static String term(String s) { return "%"+s.replace("!","!!").replace("%","!%").replace("_","!_")+"%"; }
    private static String slots(int n) { return String.join(",",Collections.nCopies(n,"?")); }
    private static void pagination(int page,int size) { require(page>=1&&page<=10000&&Set.of(10,25,50,100,200).contains(size),BAD_REQUEST,"mailing_filters_invalid"); }
    private static Contact contact(ResultSet r,int n) throws SQLException {
        String company=clean(r.getString("company_name")),person=clean(r.getString("contact_person"));
        return new Contact(r.getLong("id"),person.isBlank()?company:person,clean(r.getString("email")),company,person,clean(r.getString("owner_name")),clean(r.getString("source")),r.getString("eligibility"));
    }
    private record Query(String where,List<Object> args,String order) { }
    private Query query(long company,Filters f) {
        String search=clean(f.search()),source=clean(f.source()),tag=clean(f.tag()),list=clean(f.listId()),state=clean(f.eligibility());
        require(search.length()<=180&&source.length()<=80&&tag.length()<=180,BAD_REQUEST,"mailing_filters_invalid");
        StringBuilder where=new StringBuilder(" WHERE s.company_id=? AND "+VALID);var args=new ArrayList<Object>();args.add(company);
        if(!search.isEmpty()){where.append(" AND (s.company_name LIKE ? ESCAPE '!' OR s.contact_person LIKE ? ESCAPE '!' OR s.email LIKE ? ESCAPE '!')");for(int i=0;i<3;i++)args.add(term(search));}
        if(!source.isEmpty()){where.append(" AND s.source=?");args.add(source);}
        if(f.owner()!=null){require(f.owner()>0,BAD_REQUEST,"mailing_filters_invalid");where.append(" AND s.owner_user_company_id=?");args.add(f.owner());}
        if(!tag.isEmpty()){where.append(" AND JSON_CONTAINS(COALESCE(s.tags_json,JSON_ARRAY()),JSON_QUOTE(?))");args.add(tag);}
        if(!list.isEmpty()){saved(company,list);where.append(" AND EXISTS(SELECT 1 FROM sales_mailing_audience_members m WHERE m.company_id=s.company_id AND m.list_id=? AND m.contact_id=s.id)");args.add(list);}
        if(!state.isEmpty()){require(Set.of("READY","CONSENT_REQUIRED","INVALID","SUPPRESSED").contains(state),BAD_REQUEST,"mailing_filters_invalid");where.append(" AND (").append(ELIGIBILITY).append(")=?");args.add(state);}
        String column=switch(clean(f.sort())){case "", "name"->"COALESCE(NULLIF(TRIM(s.contact_person),''),s.company_name)";case "companyName"->"s.company_name";case "email"->"s.email";case "ownerName"->"s.owner_name";default->throw new org.springframework.web.server.ResponseStatusException(BAD_REQUEST,"mailing_filters_invalid");};
        String direction=clean(f.direction());if(direction.isEmpty())direction="asc";require(Set.of("asc","desc").contains(direction),BAD_REQUEST,"mailing_filters_invalid");
        return new Query(where.toString(),args,column+" "+direction+",s.id");
    }
    @Transactional(readOnly=true) public Page contacts(AuthSessionUser actor,Filters filters,int page,int size) {
        var a=access.read(actor);pagination(page,size);var q=query(a.companyId(),filters);
        long total=db.queryForObject("SELECT COUNT(*)"+FROM+q.where(),Long.class,q.args().toArray());
        var args=new ArrayList<>(q.args());args.add(size);args.add((page-1)*size);
        return new Page(db.query("SELECT "+FIELDS+FROM+q.where()+" ORDER BY "+q.order()+" LIMIT ? OFFSET ?",MailingAudienceService::contact,args.toArray()),total,page,size);
    }
    @Transactional(readOnly=true) public List<Contact> selection(AuthSessionUser actor,Filters filters) {
        var a=access.read(actor);var q=query(a.companyId(),filters);
        var rows=db.query("SELECT "+FIELDS+FROM+q.where()+" ORDER BY "+q.order()+" LIMIT 501",MailingAudienceService::contact,q.args().toArray());
        require(rows.size()<=500,CONFLICT,"mailing_selection_limit");return rows;
    }
    @Transactional(readOnly=true) public Options options(AuthSessionUser actor) {
        var a=access.read(actor);long company=a.companyId();
        var sources=db.queryForList("SELECT DISTINCT source FROM sales_contacts s WHERE company_id=? AND "+VALID+" AND source IS NOT NULL AND source<>'' ORDER BY source",String.class,company);
        var owners=db.query("SELECT s.owner_user_company_id,COALESCE(NULLIF(MAX(s.owner_name),''),'—') FROM sales_contacts s WHERE s.company_id=? AND "+VALID+" AND s.owner_user_company_id IS NOT NULL GROUP BY s.owner_user_company_id ORDER BY 2",(r,n)->new Option(r.getString(1),r.getString(2)),company);
        var tags=db.queryForList("SELECT DISTINCT t.tag FROM sales_contacts s JOIN JSON_TABLE(COALESCE(s.tags_json,JSON_ARRAY()), '$[*]' COLUMNS(tag VARCHAR(180) PATH '$')) t WHERE s.company_id=? AND "+VALID+" AND t.tag<>'' ORDER BY t.tag",String.class,company);
        return new Options(sources,owners,tags);
    }
    private List<Contact> resolve(long company,List<Long> ids) {
        require(ids!=null&&ids.size()<=500&&ids.stream().allMatch(id->id!=null&&id>0),BAD_REQUEST,"mailing_selection_invalid");
        if(ids.isEmpty())return List.of();var unique=new TreeSet<>(ids);var args=new ArrayList<Object>();args.add(company);args.addAll(unique);
        var rows=db.query("SELECT "+FIELDS+FROM+" WHERE s.company_id=? AND s.id IN ("+slots(unique.size())+") ORDER BY s.id",MailingAudienceService::contact,args.toArray());
        require(rows.size()==unique.size(),BAD_REQUEST,"mailing_contact_unavailable");return rows;
    }
    @Transactional(readOnly=true) public Summary preview(AuthSessionUser actor,List<Long> ids) {
        var rows=resolve(access.read(actor).companyId(),ids);var seen=new HashSet<String>();var items=new ArrayList<Contact>();int ready=0,consent=0;
        for(var row:rows){String email=row.email().toLowerCase(Locale.ROOT),state=row.eligibility();
            if(!MailingDeliveryService.address(email))state="INVALID";
            else if(!seen.add(email))state="DUPLICATE";
            if(state.equals("READY"))ready++;if(state.equals("CONSENT_REQUIRED"))consent++;
            items.add(new Contact(row.id(),row.name(),row.email(),row.companyName(),row.contactPerson(),row.ownerName(),row.source(),state));
        }
        return new Summary(items.size(),ready,consent,items.size()-ready-consent,items);
    }
    @Transactional(readOnly=true) public List<SavedList> lists(AuthSessionUser actor) {long company=access.read(actor).companyId();return db.query("SELECT l.*,(SELECT COUNT(*) FROM sales_mailing_audience_members m WHERE m.company_id=l.company_id AND m.list_id=l.id) AS member_count FROM sales_mailing_audience_lists l WHERE l.company_id=? AND l.status='ACTIVE' ORDER BY l.name,l.id",MailingAudienceService::list,company);}
    private static SavedList list(ResultSet r,int n) throws SQLException {return new SavedList(r.getString("id"),r.getString("name"),r.getLong("version"),r.getInt("member_count"),r.getTimestamp("updated_at").toInstant());}
    private SavedList saved(long company,String id) {return db.query("SELECT l.*,(SELECT COUNT(*) FROM sales_mailing_audience_members m WHERE m.company_id=l.company_id AND m.list_id=l.id) AS member_count FROM sales_mailing_audience_lists l WHERE l.company_id=? AND l.id=? AND l.status='ACTIVE'",MailingAudienceService::list,company,id).stream().findFirst().orElseThrow(()->new org.springframework.web.server.ResponseStatusException(NOT_FOUND,"mailing_list_not_found"));}
    @Transactional(readOnly=true) public ListDetail list(AuthSessionUser actor,String id) {
        long company=access.read(actor).companyId();var list=saved(company,id);
        var rows=db.query("SELECT "+FIELDS+FROM+" JOIN sales_mailing_audience_members m ON m.company_id=s.company_id AND m.contact_id=s.id WHERE m.company_id=? AND m.list_id=? AND "+VALID+" ORDER BY s.company_name,s.id",MailingAudienceService::contact,company,id);
        return new ListDetail(list,rows,list.contactCount()-rows.size());
    }
    private AuthSessionUser write(AuthSessionUser actor) {
        db.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,actor.companyId());var a=access.read(actor);
        require(MailingService.manager(a)&&modules.companyCanAccessForMutation(a.companyId(),"crm"),FORBIDDEN,"mailing_edit_forbidden");return a;
    }
    @Transactional public SavedList save(AuthSessionUser actor,String id,ListInput input) {
        var a=write(actor);try{require(UUID.fromString(id).toString().equals(id),BAD_REQUEST,"mailing_id_invalid");}catch(IllegalArgumentException e){throw new org.springframework.web.server.ResponseStatusException(BAD_REQUEST,"mailing_id_invalid");}
        require(!input.name().isBlank()&&input.name().length()<=180&&!input.contactIds().isEmpty(),BAD_REQUEST,"mailing_selection_invalid");
        var rows=resolve(a.companyId(),input.contactIds());for(var row:rows)require(Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM sales_contacts s WHERE s.company_id=? AND s.id=? AND "+VALID+")",Boolean.class,a.companyId(),row.id())),BAD_REQUEST,"mailing_contact_unavailable");
        var versions=db.queryForList("SELECT version FROM sales_mailing_audience_lists WHERE company_id=? AND id=?",Long.class,a.companyId(),id);
        if(versions.isEmpty()){require(input.version()==0,CONFLICT,"mailing_version_conflict");db.update("INSERT INTO sales_mailing_audience_lists(company_id,id,name,created_by,updated_by) VALUES(?,?,?,?,?)",a.companyId(),id,input.name().trim(),a.userId(),a.userId());}
        else {var old=saved(a.companyId(),id);require(old.version()==input.version(),CONFLICT,"mailing_version_conflict");db.update("UPDATE sales_mailing_audience_lists SET name=?,version=version+1,updated_by=?,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",input.name().trim(),a.userId(),a.companyId(),id);}
        db.update("DELETE FROM sales_mailing_audience_members WHERE company_id=? AND list_id=?",a.companyId(),id);
        for(var row:rows)db.update("INSERT INTO sales_mailing_audience_members(company_id,list_id,contact_id) VALUES(?,?,?)",a.companyId(),id,row.id());
        var result=saved(a.companyId(),id);event(a,id,"SAVED",result.version());return result;
    }
    private void event(AuthSessionUser a,String id,String action,long version){db.update("INSERT INTO sales_mailing_audience_events(company_id,list_id,actor_user_id,action,version) VALUES(?,?,?,?,?)",a.companyId(),id,a.userId(),action,version);}
    @Transactional public void archive(AuthSessionUser actor,String id,long version) {var a=write(actor);var old=saved(a.companyId(),id);require(old.version()==version,CONFLICT,"mailing_version_conflict");db.update("UPDATE sales_mailing_audience_lists SET status='ARCHIVED',version=version+1,updated_by=?,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",a.userId(),a.companyId(),id);event(a,id,"ARCHIVED",version+1);}
    @Transactional(readOnly=true) public History history(AuthSessionUser actor,long contact,int page,int size) {
        long company=access.read(actor).companyId();pagination(page,size);require(Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM sales_contacts WHERE company_id=? AND id=? AND deleted_at IS NULL)",Boolean.class,company,contact)),NOT_FOUND,"mailing_contact_unavailable");
        String scope=" FROM sales_mailing_campaigns c LEFT JOIN sales_mailing_runs r ON r.company_id=c.company_id AND r.campaign_id=c.id LEFT JOIN sales_mailing_deliveries d ON d.company_id=c.company_id AND d.campaign_id=c.id AND d.contact_id=? WHERE c.company_id=? AND (d.id IS NOT NULL OR EXISTS(SELECT 1 FROM sales_mailing_recipients m WHERE m.company_id=c.company_id AND m.campaign_id=c.id AND m.contact_id=?))";
        long total=db.queryForObject("SELECT COUNT(*)"+scope,Long.class,contact,company,contact);
        var items=db.query("SELECT c.id,c.name,c.subject,c.status,d.state,d.email,r.scheduled_at,d.completed_at"+scope+" ORDER BY c.updated_at DESC,c.id LIMIT ? OFFSET ?",(r,n)->new HistoryItem(r.getString(1),r.getString(2),r.getString(3),r.getString(4),Objects.toString(r.getString(5),r.getString(4).equals("DRAFT")?"DRAFT":"EXCLUDED"),Objects.toString(r.getString(6),""),r.getTimestamp(7)==null?null:r.getTimestamp(7).toInstant(),r.getTimestamp(8)==null?null:r.getTimestamp(8).toInstant()),contact,company,contact,size,(page-1)*size);
        return new History(items,total,page,size);
    }
}
