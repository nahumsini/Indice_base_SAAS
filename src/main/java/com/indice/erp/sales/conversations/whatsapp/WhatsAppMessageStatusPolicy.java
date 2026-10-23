package com.indice.erp.sales.conversations.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.sales.conversations.SalesConversationRepository;
import com.indice.erp.sales.conversations.SalesConversationService;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Receipts are immutable evidence, including orphans. Arrival order never replaces stronger facts. */
@Service
public class WhatsAppMessageStatusPolicy {
    private final JdbcTemplate db;private final SalesConversationRepository events;
    public WhatsAppMessageStatusPolicy(JdbcTemplate db,SalesConversationRepository events){this.db=db;this.events=events;}
    public void record(long company,String connection,JsonNode value){
        String id=value.path("id").asText(),state=value.path("status").asText();
        if(!Set.of("sent","delivered","read","failed").contains(state))return;
        Instant timestamp=Instant.ofEpochSecond(Long.parseLong(value.path("timestamp").asText()));
        String key=SalesConversationService.hash(id+":"+state+":"+timestamp);
        db.update("INSERT IGNORE INTO sales_wa_status_events(company_id,connection_id,event_key,provider_message_id,status,provider_timestamp) VALUES(?,?,?,?,?,?)",company,connection,key,id,state,Timestamp.from(timestamp));
        apply(company,connection,id);
    }
    public void apply(long company,String connection,String providerId){
        var messages=db.query("SELECT id,conversation_id FROM sales_conversation_messages WHERE company_id=? AND connection_id=? AND provider_message_id=? AND direction='OUT'",(r,n)->java.util.Map.entry(r.getString(1),r.getString(2)),company,connection,providerId);
        for(var message:messages){
            for(String state:Set.of("sent","delivered","read")){
                String column=switch(state){case "sent"->"sent_at";case "delivered"->"delivered_at";default->"read_at";};
                var stamp=db.queryForObject("SELECT MIN(provider_timestamp) FROM sales_wa_status_events WHERE company_id=? AND connection_id=? AND provider_message_id=? AND status=?",Timestamp.class,company,connection,providerId,state);
                if(stamp!=null){int changed=db.update("UPDATE sales_conversation_messages SET "+column+"=? WHERE company_id=? AND id=? AND ("+column+" IS NULL OR "+column+">?)",stamp,company,message.getKey(),stamp);
                    if(changed>0)change(company,connection,message.getKey(),message.getValue(),"PROVIDER_"+state.toUpperCase(java.util.Locale.ROOT));}
            }
            int failed=db.queryForObject("SELECT COUNT(*) FROM sales_wa_status_events WHERE company_id=? AND connection_id=? AND provider_message_id=? AND status='failed'",Integer.class,company,connection,providerId);
            if(failed>0){int changed=db.update("UPDATE sales_conversation_messages SET error_code='PROVIDER_FAILURE' WHERE company_id=? AND id=? AND error_code IS NULL",company,message.getKey());if(changed>0)change(company,connection,message.getKey(),message.getValue(),"PROVIDER_FAILURE");}
        }
    }
    private void change(long company,String connection,String message,String conversation,String type){long seq=events.event(company,connection,conversation,null,type,null,null);db.update("UPDATE sales_conversation_messages SET change_seq=? WHERE company_id=? AND id=?",seq,company,message);}
}
