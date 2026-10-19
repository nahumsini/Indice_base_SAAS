package com.indice.erp.sales;

import static com.indice.erp.sales.PostSaleWorkspaceDtos.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class PostSaleWorkspaceRepository {
    private final JdbcTemplate db;
    private final ObjectMapper json;
    PostSaleWorkspaceRepository(JdbcTemplate db, ObjectMapper json) { this.db=db; this.json=json; }
    void lockCompany(long company) {
        if (db.query("SELECT id FROM companies WHERE id=? FOR UPDATE", (rs,n)->rs.getLong(1),company).isEmpty())
            throw new NoSuchElementException();
    }
    String encode(Object value) {
        try { return json.writeValueAsString(value); }
        catch (Exception ex) { throw new IllegalArgumentException("Invalid post-sale content."); }
    }
    List<Stage> stages(String value) {
        try { return json.readValue(value,new TypeReference<List<Stage>>() {}); }
        catch (Exception ex) { throw new IllegalStateException("Invalid stored post-sale flow."); }
    }
    List<Flow> flows(long company) {
        return db.query("SELECT * FROM sales_post_sale_flows WHERE company_id=? ORDER BY id",(rs,n)->new Flow(
            rs.getLong("id"),rs.getString("name"),rs.getInt("version"),rs.getBoolean("archived"),stages(rs.getString("stages_json"))),company);
    }
    List<Owner> owners(long company) {
        return db.query("""
            SELECT uc.id,COALESCE(NULLIF(u.full_name,''),u.email) AS name FROM user_companies uc
            JOIN users u ON u.id=uc.user_id WHERE uc.company_id=? AND uc.status='active' ORDER BY name,uc.id
            """,(rs,n)->new Owner(rs.getLong(1),rs.getString(2)),company);
    }
    String actor(long company,long user) {
        return db.query("""
            SELECT u.full_name FROM user_companies uc JOIN users u ON u.id=uc.user_id
            WHERE uc.company_id=? AND uc.user_id=? AND uc.status='active'
            """,(rs,n)->rs.getString(1),company,user).stream().findFirst().orElseThrow(NoSuchElementException::new);
    }
    record SourceQuery(String select, String from, String where, List<Object> args) { }
    SourceQuery source(long company,String kind,String search,Long owner,Long flow,String stage) {
        boolean won=kind.equals("won");
        String sourceOwner=won?"s.seller_user_company_id":"s.owner_user_company_id";
        String client=won?"s.customer_name":"COALESCE(s.company_name,'')";
        String title=won?"COALESCE(o.opportunity_name,s.sale_number)":"s.opportunity_name";
        String reference=won?"s.sale_number":"s.opportunity_code";
        String from=" FROM "+(won?"sales_records":"sales_opportunities")+" s"
            +" LEFT JOIN sales_contacts c ON c.company_id=s.company_id AND c.id=s.contact_id AND c.deleted_at IS NULL"
            +(won?" LEFT JOIN sales_opportunities o ON o.company_id=s.company_id AND o.id=s.opportunity_id":"")
            +" LEFT JOIN sales_post_sale_work w ON w.company_id=s.company_id AND w.source_kind='"+kind+"' AND w.source_id=s.id"
            +" LEFT JOIN user_companies uc ON uc.company_id=s.company_id AND uc.id=COALESCE(w.owner_user_company_id,"+sourceOwner+")"
            +" LEFT JOIN users u ON u.id=uc.user_id";
        String where=" WHERE s.company_id=? AND s.deleted_at IS NULL AND "+(won
            ?"LOWER(s.commercial_status) NOT IN ('cancelled','canceled','rejected','voided')"
            :"s.lifecycle_status='LOST'");
        var args=new ArrayList<Object>();args.add(company);
        if(search!=null&&!search.isBlank()) { where+=" AND ("+client+" LIKE ? OR "+title+" LIKE ? OR "+reference+" LIKE ?)"; String q="%"+search.trim()+"%";args.add(q);args.add(q);args.add(q); }
        if(owner!=null) {where+=" AND COALESCE(w.owner_user_company_id,"+sourceOwner+")=?";args.add(owner);}
        if(flow!=null&&won) {where+=" AND COALESCE(w.flow_id,0)=?";args.add(flow);}
        String stageExpression=won?"COALESCE(w.stage_key,'pending')":"COALESCE(w.recovery_status,'unscheduled')";
        if(stage!=null&&!stage.isBlank()&&!stage.equals("all")) {where+=" AND "+stageExpression+"=?";args.add(stage);}
        String select="SELECT s.id AS source_id,"+reference+" AS reference,"+title+" AS title,"+client+" AS client_name,"
            +"COALESCE(c.contact_person,"+(won?"''":"s.contact_person")+",'') AS contact_name,"
            +"COALESCE(c.phone,"+(won?"''":"s.phone")+",'') AS phone,COALESCE(c.email,"+(won?"''":"s.email")+",'') AS email,"
            +"s.contact_id,"+(won?"s.opportunity_id":"s.id AS opportunity_id")+",w.id AS work_id,COALESCE(w.version,0) AS version,"
            +"COALESCE(w.flow_id,0) AS flow_id,"+stageExpression+" AS stage_key,COALESCE(w.owner_user_company_id,"+sourceOwner+") AS owner_id,"
            +"COALESCE(u.full_name,"+(won?"s.seller_name":"s.owner_name")+",'') AS owner_name,"
            +"COALESCE(w.next_action,'') AS next_action,w.next_action_date,COALESCE(w.notes,'') AS notes,"
            +"COALESCE(w.loss_reason,'') AS loss_reason,COALESCE(w.recovery_status,'unscheduled') AS recovery_status,w.recovered_opportunity_id";
        return new SourceQuery(select,from,where,args);
    }
    Item map(ResultSet rs,String kind) throws SQLException {
        return new Item(kind,rs.getLong("source_id"),rs.getString("reference"),rs.getString("title"),rs.getString("client_name"),
            rs.getString("contact_name"),rs.getString("phone"),rs.getString("email"),rs.getObject("contact_id",Long.class),rs.getObject("opportunity_id",Long.class),
            rs.getObject("work_id",Long.class),rs.getInt("version"),rs.getLong("flow_id"),rs.getString("stage_key"),rs.getObject("owner_id",Long.class),rs.getString("owner_name"),
            rs.getString("next_action"),rs.getObject("next_action_date",LocalDate.class),rs.getString("notes"),rs.getString("loss_reason"),rs.getString("recovery_status"),rs.getObject("recovered_opportunity_id",Long.class));
    }
    Item item(long company,String kind,long id) {
        var q=source(company,kind,null,null,null,null);var args=new ArrayList<>(q.args());args.add(id);
        return db.query(q.select()+q.from()+q.where()+" AND s.id=?",(rs,n)->map(rs,kind),args.toArray()).stream().findFirst().orElseThrow(NoSuchElementException::new);
    }
    List<Item> items(SourceQuery q,String kind,int page,int size) {
        var args=new ArrayList<>(q.args());args.add(size);args.add((page-1)*size);
        return db.query(q.select()+q.from()+q.where()+" ORDER BY (w.next_action_date IS NULL),w.next_action_date,s.id DESC LIMIT ? OFFSET ?",
            (rs,n)->map(rs,kind),args.toArray());
    }
    Counts counts(SourceQuery q,String kind,LocalDate today) {
        String active=kind.equals("won")?"COALESCE(w.stage_key,'pending')<>'completed'":"COALESCE(w.recovery_status,'unscheduled') NOT IN ('recovered','paused')";
        String completed=kind.equals("won")?"w.stage_key='completed'":"w.recovery_status='recovered'";
        var args=new ArrayList<Object>();args.add(today);args.add(today);args.addAll(q.args());
        return db.queryForObject("SELECT COUNT(*) total,COALESCE(SUM(("+active+") AND w.next_action_date<?),0) overdue,"
            +"COALESCE(SUM(("+active+") AND w.next_action_date=?),0) today,COALESCE(SUM(("+active+") AND w.next_action_date IS NULL),0) unscheduled,"
            +"COALESCE(SUM("+completed+"),0) completed"+q.from()+q.where(),
            (rs,n)->new Counts(rs.getLong(1),rs.getLong(2),rs.getLong(3),rs.getLong(4),rs.getLong(5)),args.toArray());
    }
    List<Event> history(long company,long work) {
        return db.query("SELECT * FROM sales_post_sale_work_events WHERE company_id=? AND work_id=? ORDER BY id DESC LIMIT 50",
            (rs,n)->new Event(rs.getLong("id"),rs.getString("event_type"),rs.getString("actor_name"),rs.getString("detail_json"),rs.getObject("created_at",LocalDateTime.class)),company,work);
    }
    void event(long company,long work,long user,String actor,String type,Object detail) {
        db.update("INSERT INTO sales_post_sale_work_events(company_id,work_id,actor_user_id,actor_name,event_type,detail_json) VALUES(?,?,?,?,?,CAST(? AS JSON))",
            company,work,user,actor,type,encode(detail));
    }
}
