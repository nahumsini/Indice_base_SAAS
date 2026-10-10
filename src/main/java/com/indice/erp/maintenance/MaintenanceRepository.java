package com.indice.erp.maintenance;

import com.indice.erp.auth.AuthSessionUser;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.*;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.maintenance.MaintenanceDtos.*;

@Repository
public class MaintenanceRepository {
    final JdbcTemplate jdbc;
    final MaintenanceAccess access;
    final ObjectMapper mapper;
    public MaintenanceRepository(JdbcTemplate jdbc,MaintenanceAccess access,ObjectMapper mapper){this.jdbc=jdbc;this.access=access;this.mapper=mapper;}
    JdbcTemplate jdbc(){return jdbc;}
    long insert(String sql,Object...args){var keys=new GeneratedKeyHolder();jdbc.update(c->{var p=c.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS);for(int i=0;i<args.length;i++)p.setObject(i+1,args[i]);return p;},keys);return Objects.requireNonNull(keys.getKey()).longValue();}
    static Timestamp time(Instant value){return value==null?null:Timestamp.from(value);}
    static Instant instant(ResultSet r,String column)throws SQLException{var value=r.getTimestamp(column);return value==null?null:value.toInstant();}
    String json(Object value){try{return mapper.writeValueAsString(value);}catch(Exception e){throw new IllegalArgumentException("Invalid maintenance data",e);}}
    <T>T parse(String value,TypeReference<T> type){try{return mapper.readValue(value,type);}catch(Exception e){throw new IllegalStateException("Invalid stored maintenance data",e);}}
    <T>T one(List<T> rows){if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);return rows.getFirst();}
    private static List<Object> args(long company,MaintenanceAccess.Filter filter){var args=new ArrayList<Object>();args.add(company);args.addAll(filter.args());return args;}
    public Settings settings(long company){
        var rows=jdbc.query("SELECT * FROM maintenance_settings WHERE company_id=?",(r,n)->new Settings(r.getString("timezone"),r.getString("currency"),r.getBigDecimal("hourly_rate"),r.getInt("critical_hours"),r.getInt("high_hours"),r.getInt("normal_hours"),r.getInt("low_hours"),parse(r.getString("categories"),new TypeReference<List<String>>(){}),parse(r.getString("specialties"),new TypeReference<List<String>>(){}),parse(r.getString("procedures"),new TypeReference<List<Procedure>>(){}),r.getBoolean("evidence_required"),r.getLong("version")),company);
        return rows.isEmpty()?new Settings("UTC","MXN",BigDecimal.ZERO,2,8,24,72,List.of(),List.of(),List.of(),true,0):rows.getFirst();
    }
    private final RowMapper<Asset> assetMapper=(r,n)->new Asset(r.getLong("id"),r.getString("name"),r.getString("asset_type"),r.getObject("hr_asset_id",Long.class),r.getObject("unit_id",Long.class),r.getObject("business_id",Long.class),r.getString("location"),r.getString("criticality"),r.getString("notes"),r.getBoolean("active"),r.getBoolean("unavailable"),r.getLong("version"));
    private static final String ASSETS="SELECT a.*,EXISTS(SELECT 1 FROM maintenance_outages d WHERE d.company_id=a.company_id AND d.asset_id=a.id AND d.ended_at IS NULL) unavailable FROM maintenance_assets a";
    public Asset asset(AuthSessionUser actor,long id){var f=access.filter(actor,"a","ASSET");var p=args(actor.companyId(),f);p.add(id);return one(jdbc.query(ASSETS+" WHERE a.company_id=?"+f.sql()+" AND a.id=?",assetMapper,p.toArray()));}
    public Page<Asset> assets(AuthSessionUser actor,String search,boolean active,int page,int size){return assets(actor,search,active,page,size,"name","asc");}
    public Page<Asset> assets(AuthSessionUser actor,String search,boolean active,int page,int size,String sort,String direction){var f=access.filter(actor,"a","ASSET");var p=args(actor.companyId(),f);p.add("%"+escape(search)+"%");String where=" WHERE a.company_id=?"+f.sql()+" AND a.name LIKE ?"+(active?" AND a.active=1":"");long count=jdbc.queryForObject("SELECT COUNT(*) FROM maintenance_assets a"+where,Long.class,p.toArray());p.add(size);p.add((page-1)*size);return new Page<>(jdbc.query(ASSETS+where+MaintenanceSort.clause("assets",sort,direction)+" LIMIT ? OFFSET ?",assetMapper,p.toArray()),count,page,size);}
    private final RowMapper<RequestItem> requestMapper=(r,n)->new RequestItem(r.getLong("id"),r.getObject("asset_id",Long.class),r.getString("asset_name"),r.getObject("unit_id",Long.class),r.getObject("business_id",Long.class),r.getLong("requester_id"),r.getString("title"),r.getString("description"),r.getString("location"),r.getString("priority"),r.getString("category"),r.getString("status"),instant(r,"response_at"),instant(r,"created_at"),r.getObject("order_id",Long.class),r.getLong("version"));
    private static final String REQUESTS="SELECT r.*,a.name asset_name,o.id order_id FROM maintenance_requests r LEFT JOIN maintenance_assets a ON a.company_id=r.company_id AND a.id=r.asset_id LEFT JOIN maintenance_orders o ON o.company_id=r.company_id AND o.request_id=r.id";
    public RequestItem request(AuthSessionUser actor,long id){var f=access.filter(actor,"r","REQUEST");var p=args(actor.companyId(),f);p.add(id);return one(jdbc.query(REQUESTS+" WHERE r.company_id=?"+f.sql()+" AND r.id=?",requestMapper,p.toArray()));}
    public Page<RequestItem> requests(AuthSessionUser actor,String search,String status,int page,int size){return requests(actor,search,status,page,size,"created","desc");}
    public Page<RequestItem> requests(AuthSessionUser actor,String search,String status,int page,int size,String sort,String direction){var f=access.filter(actor,"r","REQUEST");var p=args(actor.companyId(),f);p.add("%"+escape(search)+"%");String where=" WHERE r.company_id=?"+f.sql()+" AND r.title LIKE ?";if(!status.isBlank()){where+=" AND r.status=?";p.add(status);}long count=jdbc.queryForObject("SELECT COUNT(*) FROM maintenance_requests r"+where,Long.class,p.toArray());p.add(size);p.add((page-1)*size);return new Page<>(jdbc.query(REQUESTS+where+MaintenanceSort.clause("requests",sort,direction)+" LIMIT ? OFFSET ?",requestMapper,p.toArray()),count,page,size);}
    private final RowMapper<Order> orderMapper=(r,n)->new Order(r.getLong("id"),r.getObject("asset_id",Long.class),r.getString("asset_name"),r.getObject("request_id",Long.class),r.getObject("plan_id",Long.class),r.getObject("unit_id",Long.class),r.getObject("business_id",Long.class),r.getString("title"),r.getString("description"),r.getString("order_type"),r.getString("priority"),r.getString("category"),r.getString("status"),r.getObject("assignee_id",Long.class),r.getString("assignee_name"),instant(r,"due_at"),instant(r,"original_due_at"),instant(r,"scheduled_start"),instant(r,"scheduled_end"),r.getString("timezone"),r.getString("diagnosis"),r.getString("resolution"),parse(r.getString("checklist"),new TypeReference<List<Step>>(){}),r.getBoolean("evidence_required"),r.getBoolean("blocking"),r.getString("currency"),r.getBigDecimal("estimated_amount"),instant(r,"started_at"),instant(r,"closed_at"),instant(r,"created_at"),r.getLong("version"));
    private static final String ORDERS="SELECT o.*,a.name asset_name,u.full_name assignee_name FROM maintenance_orders o LEFT JOIN maintenance_assets a ON a.company_id=o.company_id AND a.id=o.asset_id LEFT JOIN users u ON u.id=o.assignee_id";
    public Order order(AuthSessionUser actor,long id){var f=access.filter(actor,"o","ORDER");var p=args(actor.companyId(),f);p.add(id);return one(jdbc.query(ORDERS+" WHERE o.company_id=?"+f.sql()+" AND o.id=?",orderMapper,p.toArray()));}
    public Page<Order> orders(AuthSessionUser actor,String search,String status,String attention,long assetId,int page,int size,Instant from,Instant to){return orders(actor,search,status,attention,assetId,page,size,from,to,"due","asc");}
    public Page<Order> orders(AuthSessionUser actor,String search,String status,String attention,long assetId,int page,int size,Instant from,Instant to,String sort,String direction){
        var f=access.filter(actor,"o","ORDER");var p=args(actor.companyId(),f);String where=" WHERE o.company_id=?"+f.sql()+" AND o.title LIKE ?";p.add("%"+escape(search)+"%");
        if(!status.isBlank()){where+=" AND o.status=?";p.add(status);}
        if(assetId>0){where+=" AND o.asset_id=?";p.add(assetId);}
        if(Set.of("open","overdue","critical").contains(attention))where+=" AND o.status NOT IN ('CLOSED','CANCELLED')";
        if(attention.equals("overdue"))where+=" AND o.due_at<UTC_TIMESTAMP(6)";
        if(attention.equals("critical"))where+=" AND o.priority='CRITICAL'";
        if(attention.equals("preventive"))where+=" AND o.order_type='PREVENTIVE' AND o.status<>'CANCELLED'";
        if(from!=null){String dateColumn=attention.equals("preventive")?"o.original_due_at":"o.due_at";where+=" AND "+dateColumn+">=? AND "+dateColumn+"<?";p.add(time(from));p.add(time(to));}
        long count=jdbc.queryForObject("SELECT COUNT(*) FROM maintenance_orders o"+where,Long.class,p.toArray());p.add(size);p.add((page-1)*size);
        return new Page<>(jdbc.query(ORDERS+where+MaintenanceSort.clause("orders",sort,direction)+" LIMIT ? OFFSET ?",orderMapper,p.toArray()),count,page,size);
    }
    public List<Event> history(long company,String type,long id){return jdbc.query("SELECT * FROM maintenance_events WHERE company_id=? AND entity_type=? AND entity_id=? ORDER BY id DESC LIMIT 100",(r,n)->new Event(r.getLong("id"),r.getString("action"),r.getObject("actor_id",Long.class),r.getString("reason"),instant(r,"created_at")),company,type,id);}
    public List<Attachment> attachments(long company,String type,long id){return jdbc.query("SELECT * FROM maintenance_attachments WHERE company_id=? AND entity_type=? AND entity_id=? ORDER BY id",(r,n)->new Attachment(r.getLong("id"),r.getString("filename"),r.getString("content_type"),r.getLong("size_bytes"),instant(r,"created_at")),company,type,id);}
    public OrderDetail detail(AuthSessionUser actor,long id){var row=order(actor,id);var tasks=jdbc.queryForList("SELECT task_id FROM maintenance_task_links WHERE company_id=? AND order_id=?",Long.class,actor.companyId(),id);return new OrderDetail(row,history(actor.companyId(),"ORDER",id),attachments(actor.companyId(),"ORDER",id),tasks.isEmpty()?null:tasks.getFirst());}
    public RequestDetail requestDetail(AuthSessionUser actor,long id){var row=request(actor,id);return new RequestDetail(row,history(actor.companyId(),"REQUEST",id),attachments(actor.companyId(),"REQUEST",id));}
    void audit(AuthSessionUser actor,String type,long id,String action,String reason){jdbc.update("INSERT INTO maintenance_events(company_id,entity_type,entity_id,action,actor_id,reason) VALUES(?,?,?,?,?,?)",actor.companyId(),type,id,action,actor.userId(),reason);}
    public static String escape(String value){return value.replace("\\","\\\\").replace("%","\\%").replace("_","\\_");}
    public Page<Choice> members(AuthSessionUser actor,String query,int page,int size){
        MaintenanceAccess.manage(actor);var f=access.filter(actor,"wp","ASSET");var p=args(actor.companyId(),f);p.add("%"+escape(query)+"%");
        String from=" FROM user_companies uc JOIN users u ON u.id=uc.user_id LEFT JOIN user_work_profiles wp ON wp.company_id=uc.company_id AND wp.user_company_id=uc.id WHERE uc.company_id=?"+f.sql()+" AND uc.status='active' AND u.full_name LIKE ? AND (uc.role IN ('root','superadmin') OR (EXISTS(SELECT 1 FROM user_company_module_roles mr WHERE mr.user_company_id=uc.id AND mr.module_slug='maintenance') AND EXISTS(SELECT 1 FROM user_company_tab_permissions tp WHERE tp.user_company_id=uc.id AND tp.module_slug='maintenance' AND tp.tab_key='orders' AND tp.can_view=1)))";
        long count=jdbc.queryForObject("SELECT COUNT(DISTINCT u.id)"+from,Long.class,p.toArray());p.add(size);p.add((page-1)*size);return new Page<>(jdbc.query("SELECT DISTINCT u.id,u.full_name"+from+" ORDER BY u.full_name,u.id LIMIT ? OFFSET ?",(r,n)->new Choice(r.getLong(1),r.getString(2)),p.toArray()),count,page,size);
    }
}
