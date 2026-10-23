package com.indice.erp.sales.conversations;

import static com.indice.erp.sales.conversations.SalesConversationDtos.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Repository;

/** All aggregate queries carry company_id. Rows remain private owner data. */
@Repository
public class SalesConversationRepository {
    final JdbcTemplate db;private final ObjectMapper json;
    public SalesConversationRepository(JdbcTemplate db,ObjectMapper json){this.db=db;this.json=json;}
    public static Instant instant(ResultSet r,String name)throws SQLException {var t=r.getTimestamp(name);return t==null?null:t.toInstant();}
    public List<Member> activeMembers(long company){return db.query("SELECT uc.id,u.full_name FROM user_companies uc JOIN users u ON u.id=uc.user_id WHERE uc.company_id=? AND uc.status='active' ORDER BY u.full_name,uc.id LIMIT 200",(r,n)->new Member(r.getLong(1),r.getString(2),Set.of(),true,0),company);}
    public Optional<Long> activeMember(long company,long membership){return db.query("SELECT uc.user_id FROM user_companies uc JOIN users u ON u.id=uc.user_id WHERE uc.company_id=? AND uc.id=? AND uc.status='active'",(r,n)->r.getLong(1),company,membership).stream().findFirst();}
    public void lock(long company){db.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,company);}
    public Optional<Connection> connection(long company){return db.query("SELECT * FROM sales_wa_connections WHERE company_id=? AND operational_slot=1",CONNECTION,company).stream().findFirst();}
    public Optional<Connection> connection(long company,String id){return db.query("SELECT * FROM sales_wa_connections WHERE company_id=? AND id=?",CONNECTION,company,id).stream().findFirst();}
    private static final RowMapper<Connection> CONNECTION=(r,n)->new Connection(r.getString("id"),r.getString("display_phone"),r.getString("status"),r.getLong("version"),r.getObject("unit_id",Long.class),r.getObject("business_id",Long.class),instant(r,"verified_at"),instant(r,"last_signal_at"),r.getString("reason_code"));
    public void setup(long company,String id,String app,long membership,SalesConversationAccess.Scope scope){
        db.update("INSERT INTO sales_wa_connections(company_id,id,app_id,waba_id,phone_number_id,display_phone,unit_id,business_id,created_by_membership) VALUES(?,?,?,?,?,'',?,?,?)",company,id,app,"pending-"+id,"pending-"+id,scope.unit(),scope.business(),membership);
    }
    public String providerPhone(long company,String id){return db.queryForObject("SELECT phone_number_id FROM sales_wa_connections WHERE company_id=? AND id=?",String.class,company,id);}
    public void install(long company,String id,String app,String waba,String phone,String display,String encrypted,String keyVersion){
        db.update("UPDATE sales_wa_connections SET app_id=?,waba_id=?,phone_number_id=?,display_phone=?,credential_ciphertext=?,key_version=?,status='CONNECTED',verified_at=CURRENT_TIMESTAMP(6),version=version+1 WHERE company_id=? AND id=? AND status='CONFIGURING'",app,waba,phone,display,encrypted,keyVersion,company,id);
    }
    public List<Member> members(long company,String connection){return db.query("SELECT m.*,u.full_name FROM sales_wa_members m JOIN user_companies uc ON uc.company_id=m.company_id AND uc.id=m.membership_id JOIN users u ON u.id=uc.user_id WHERE m.company_id=? AND m.connection_id=? ORDER BY u.full_name,m.membership_id",(r,n)->{
        Set<Capability> caps;try{caps=json.readValue(r.getString("capabilities"),json.getTypeFactory().constructCollectionType(EnumSet.class,Capability.class));}catch(Exception e){caps=Set.of();}
        return new Member(r.getLong("membership_id"),r.getString("full_name"),caps,r.getBoolean("active"),r.getLong("version"));
    },company,connection);}
    public void revoke(long company,String connection,long member){db.update("UPDATE sales_wa_members SET active=0,capabilities=JSON_ARRAY(),version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND connection_id=? AND membership_id=?",company,connection,member);}
    public void grant(long company,String connection,long membership,Grant input,SalesConversationAccess.Scope scope){
        db.update("INSERT INTO sales_wa_members(company_id,connection_id,membership_id,capabilities,active,unit_id,business_id) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE capabilities=VALUES(capabilities),active=VALUES(active),unit_id=VALUES(unit_id),business_id=VALUES(business_id),version=version+1,updated_at=CURRENT_TIMESTAMP(6)",company,connection,membership,encode(input.capabilities()),input.active(),scope.unit(),scope.business());
    }
    public Optional<Conversation> find(long company,String id){return db.query("SELECT * FROM sales_conversations WHERE company_id=? AND id=?",CONVERSATION,company,id).stream().findFirst();}
    private static final RowMapper<Conversation> CONVERSATION=(r,n)->new Conversation(r.getString("id"),r.getString("connection_id"),r.getString("phone_e164"),r.getString("status"),r.getObject("assignee_membership_id",Long.class),r.getObject("contact_id",Long.class),r.getObject("opportunity_id",Long.class),r.getLong("version"),r.getLong("change_seq"),instant(r,"last_inbound_at"),instant(r,"last_activity_at"),r.getBoolean("outbound_blocked"));
    public Page list(long company,String connection,long member,Set<Capability> caps,String box,String search,int page,int size){
        var args=new ArrayList<Object>(List.of(company,connection));
        String where=" WHERE company_id=? AND connection_id=?";
        boolean all=caps.contains(Capability.READ_ALL),take=caps.contains(Capability.TAKE),own=caps.contains(Capability.READ_OWN);
        where+=switch(box){case "MINE"->" AND status='OPEN' AND assignee_membership_id=?";case "UNASSIGNED"->" AND status='OPEN' AND assignee_membership_id IS NULL";case "RESOLVED"->" AND status='RESOLVED'";default->"";};
        if(box.equals("MINE"))args.add(member);
        if(all&&!(take&&own))where+=" AND assignee_membership_id IS NOT NULL";
        if(!all){where+=" AND ("+(own?"assignee_membership_id=?":"1=0")+(take&&own?" OR assignee_membership_id IS NULL":"")+")";if(own)args.add(member);}
        where+=" AND phone_e164 LIKE ? ESCAPE '!'";args.add("%"+search.replace("!","!!").replace("%","!%").replace("_","!_")+"%");
        long count=db.queryForObject("SELECT COUNT(*) FROM sales_conversations"+where,Long.class,args.toArray());
        args.add(size);args.add((page-1)*size);
        return new Page(db.query("SELECT * FROM sales_conversations"+where+" ORDER BY last_activity_at DESC,id LIMIT ? OFFSET ?",CONVERSATION,args.toArray()),count,page,size,cursor(company,connection));
    }
    public long cursor(long company,String connection){return db.queryForObject("SELECT COALESCE(MAX(seq),0) FROM sales_conversation_events WHERE company_id=? AND connection_id=?",Long.class,company,connection);}
    public long event(long company,String connection,String conversation,Long actor,String type,Long target,String key){
        return transition(company,connection,conversation,actor,type,target,key,null,null,null);
    }
    public long transition(long company,String connection,String conversation,Long actor,String type,Long target,String key,Long previous,String before,String after){
        String correlation=org.slf4j.MDC.get("requestId");if(correlation!=null&&!correlation.matches("[A-Za-z0-9._:-]{1,80}"))correlation=null;
        db.update("INSERT INTO sales_conversation_events(company_id,connection_id,conversation_id,actor_membership_id,event_type,target_membership_id,request_key,previous_membership_id,previous_status,resulting_status,correlation_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)",company,connection,conversation,actor,type,target,key,previous,before,after,correlation);
        long seq=cursor(company,connection);
        if(conversation!=null)db.update("UPDATE sales_conversations SET change_seq=? WHERE company_id=? AND id=?",seq,company,conversation);
        return seq;
    }
    public List<Event> events(long company,String conversation,long after){var events=db.query("SELECT e.*,COALESCE(a.full_name,'') AS actor_name,COALESCE(t.full_name,'') AS target_name FROM sales_conversation_events e LEFT JOIN user_companies ac ON ac.company_id=e.company_id AND ac.id=e.actor_membership_id LEFT JOIN users a ON a.id=ac.user_id LEFT JOIN user_companies tc ON tc.company_id=e.company_id AND tc.id=e.target_membership_id LEFT JOIN users t ON t.id=tc.user_id WHERE e.company_id=? AND e.conversation_id=? AND e.seq>? ORDER BY e.seq "+(after==0?"DESC":"ASC")+" LIMIT 100",(r,n)->new Event(r.getLong("seq"),r.getString("event_type"),r.getObject("actor_membership_id",Long.class),r.getObject("target_membership_id",Long.class),r.getString("actor_name"),r.getString("target_name"),instant(r,"created_at")),company,conversation,after);if(after==0)java.util.Collections.reverse(events);return events;}
    public List<Message> messages(long company,String conversation,long after,long through,Instant before){
        String condition=before==null?"":" AND m.created_at<?";var args=new ArrayList<Object>(List.of(company,conversation,after,through));if(before!=null)args.add(Timestamp.from(before));
        return db.query("SELECT m.*,COALESCE(u.full_name,'') AS author_name FROM sales_conversation_messages m LEFT JOIN user_companies uc ON uc.company_id=m.company_id AND uc.id=m.author_membership_id LEFT JOIN users u ON u.id=uc.user_id WHERE m.company_id=? AND m.conversation_id=? AND m.change_seq>? AND m.change_seq<=?"+condition+" ORDER BY m.created_at DESC,m.id DESC LIMIT 101",MESSAGE,args.toArray());
    }
    static final RowMapper<Message> MESSAGE=(r,n)->new Message(r.getString("id"),r.getString("direction"),r.getString("message_type"),r.getString("body"),r.getString("dispatch_state"),r.getObject("author_membership_id",Long.class),r.getString("author_name"),instant(r,"created_at"),instant(r,"sent_at"),instant(r,"delivered_at"),instant(r,"read_at"),r.getString("error_code"),r.getLong("change_seq"),List.of());
    public List<Note> notes(long company,String conversation,long after,long through){return db.query("SELECT n.*,COALESCE(u.full_name,'') AS author_name FROM sales_conversation_notes n LEFT JOIN user_companies uc ON uc.company_id=n.company_id AND uc.id=n.author_membership_id LEFT JOIN users u ON u.id=uc.user_id WHERE n.company_id=? AND n.conversation_id=? AND n.change_seq>? AND n.change_seq<=? ORDER BY n.created_at DESC,n.id DESC LIMIT 100",(r,n)->new Note(r.getString("id"),r.getLong("author_membership_id"),r.getString("author_name"),r.getString("body"),instant(r,"created_at")),company,conversation,after,through);}
    public Optional<Receipt> receipt(long company,long actor,String key,String fingerprint){
        var rows=db.query("SELECT fingerprint,result_json FROM sales_conversation_commands WHERE company_id=? AND actor_membership_id=? AND request_key=?",(r,n)->Map.entry(r.getString(1),r.getString(2)),company,actor,key);
        if(rows.isEmpty())return Optional.empty();
        SalesConversationAccess.require(rows.getFirst().getKey().equals(fingerprint),org.springframework.http.HttpStatus.CONFLICT,"conversation_request_conflict");
        try{return Optional.of(json.readValue(rows.getFirst().getValue(),Receipt.class));}catch(Exception e){throw new IllegalStateException("Conversation receipt unavailable");}
    }
    public void receipt(long company,long actor,String key,String conversation,String fingerprint,Receipt result){db.update("INSERT INTO sales_conversation_commands(company_id,actor_membership_id,request_key,conversation_id,fingerprint,result_json) VALUES(?,?,?,?,?,?)",company,actor,key,conversation,fingerprint,encode(result));}
    public void connectionReceipt(long company,long actor,String key,String connection,String fingerprint,Receipt result){db.update("INSERT INTO sales_conversation_commands(company_id,actor_membership_id,request_key,connection_id,fingerprint,result_json) VALUES(?,?,?,?,?,?)",company,actor,key,connection,fingerprint,encode(result));}
    public int assignment(long company,String id,long version,Long target,boolean take){return db.update("UPDATE sales_conversations SET assignee_membership_id=?,version=version+1 WHERE company_id=? AND id=? AND version=?"+(take?" AND assignee_membership_id IS NULL AND status='OPEN'":""),target,company,id,version);}
    public void optOut(long company,String id){db.update("UPDATE sales_conversations SET outbound_blocked=1,version=version+1 WHERE company_id=? AND id=?",company,id);}
    public void state(long company,String id,String state){db.update("UPDATE sales_conversations SET status=?,version=version+1 WHERE company_id=? AND id=?",state,company,id);}
    public void note(long company,String id,String conversation,long actor,String body,long seq){db.update("INSERT INTO sales_conversation_notes(company_id,id,conversation_id,author_membership_id,body,change_seq) VALUES(?,?,?,?,?,?)",company,id,conversation,actor,body,seq);}
    public void enqueue(long company,String id,Conversation c,long actor,String body,long seq){
        db.update("INSERT INTO sales_conversation_messages(company_id,id,conversation_id,connection_id,direction,message_type,body,author_membership_id,dispatch_state,recipient_snapshot,sender_snapshot,window_basis_at,change_seq) SELECT ?,?,?,?,'OUT','TEXT',?,?,'QUEUED',?,phone_number_id,?,? FROM sales_wa_connections WHERE company_id=? AND id=?",company,id,c.id(),c.connectionId(),body,actor,c.phone().substring(1),c.lastInboundAt()==null?null:Timestamp.from(c.lastInboundAt()),seq,company,c.connectionId());
        db.update("INSERT INTO sales_wa_outbox(company_id,message_id,connection_id) VALUES(?,?,?)",company,id,c.connectionId());
        db.update("UPDATE sales_conversations SET last_activity_at=CURRENT_TIMESTAMP(6),version=version+1 WHERE company_id=? AND id=?",company,c.id());
    }
    private String older(String table,long company,String conversation,String before,List<Object> args,String alias){
        if(before==null)return "";
        var rows=db.query("SELECT created_at,id FROM "+table+" WHERE company_id=? AND conversation_id=? AND id=?",(r,n)->Map.entry(r.getTimestamp(1),r.getString(2)),company,conversation,before);
        SalesConversationAccess.require(!rows.isEmpty(),org.springframework.http.HttpStatus.NOT_FOUND,"conversation_cursor_unavailable");var cursor=rows.getFirst();args.add(cursor.getKey());args.add(cursor.getKey());args.add(cursor.getValue());return " AND ("+alias+".created_at<? OR "+alias+".created_at=? AND "+alias+".id<?)";
    }
    public List<Message> olderMessages(long company,String conversation,String before){var args=new ArrayList<Object>(List.of(company,conversation));String limit=older("sales_conversation_messages",company,conversation,before,args,"m");
        return db.query("SELECT m.*,COALESCE(u.full_name,'') AS author_name FROM sales_conversation_messages m LEFT JOIN user_companies uc ON uc.company_id=m.company_id AND uc.id=m.author_membership_id LEFT JOIN users u ON u.id=uc.user_id WHERE m.company_id=? AND m.conversation_id=?"+limit+" ORDER BY m.created_at DESC,m.id DESC LIMIT 101",MESSAGE,args.toArray());
    }
    public List<Note> olderNotes(long company,String conversation,String before){var args=new ArrayList<Object>(List.of(company,conversation));String limit=older("sales_conversation_notes",company,conversation,before,args,"n");
        return db.query("SELECT n.*,COALESCE(u.full_name,'') AS author_name FROM sales_conversation_notes n LEFT JOIN user_companies uc ON uc.company_id=n.company_id AND uc.id=n.author_membership_id LEFT JOIN users u ON u.id=uc.user_id WHERE n.company_id=? AND n.conversation_id=?"+limit+" ORDER BY n.created_at DESC,n.id DESC LIMIT 101",(r,n)->new Note(r.getString("id"),r.getLong("author_membership_id"),r.getString("author_name"),r.getString("body"),instant(r,"created_at")),args.toArray());
    }
    public List<Event> olderEvents(long company,String conversation,Long before){return db.query("SELECT e.*,COALESCE(a.full_name,'') AS actor_name,COALESCE(t.full_name,'') AS target_name FROM sales_conversation_events e LEFT JOIN user_companies ac ON ac.company_id=e.company_id AND ac.id=e.actor_membership_id LEFT JOIN users a ON a.id=ac.user_id LEFT JOIN user_companies tc ON tc.company_id=e.company_id AND tc.id=e.target_membership_id LEFT JOIN users t ON t.id=tc.user_id WHERE e.company_id=? AND e.conversation_id=? AND e.seq<? ORDER BY e.seq DESC LIMIT 101",(r,n)->new Event(r.getLong("seq"),r.getString("event_type"),r.getObject("actor_membership_id",Long.class),r.getObject("target_membership_id",Long.class),r.getString("actor_name"),r.getString("target_name"),instant(r,"created_at")),company,conversation,before==null?Long.MAX_VALUE:before);}
    public void messageType(long company,String message,String type){db.update("UPDATE sales_conversation_messages SET message_type=? WHERE company_id=? AND id=?",type,company,message);}
    public void crmLink(long company,String conversation,Long contact,Long opportunity){db.update("UPDATE sales_conversations SET contact_id=?,opportunity_id=?,version=version+1 WHERE company_id=? AND id=?",contact,opportunity,company,conversation);}
    public List<Long> taskIds(long company,String conversation){return db.query("SELECT task_id FROM sales_conversation_tasks WHERE company_id=? AND conversation_id=? ORDER BY created_at DESC LIMIT 100",(r,n)->r.getLong(1),company,conversation);}
    public void taskLink(long company,String conversation,long task,long actor){db.update("INSERT INTO sales_conversation_tasks(company_id,conversation_id,task_id,created_by_membership_id) VALUES(?,?,?,?)",company,conversation,task,actor);}
    public void read(long company,String conversation,long member,long seq){db.update("INSERT INTO sales_conversation_reads(company_id,conversation_id,membership_id,read_seq) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE read_seq=GREATEST(read_seq,VALUES(read_seq))",company,conversation,member,seq);}
    public String encode(Object value){try{return json.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Conversation serialization unavailable");}}
}
