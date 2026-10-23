package com.indice.erp.sales.conversations.whatsapp;

import com.fasterxml.jackson.databind.*;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.indice.erp.sales.conversations.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class WhatsAppWebhookWorker {
    private final SalesConversationNotificationSource notices;
    private final SalesConversationAttachmentRepository attachments;
    private final TransactionTemplate tx;private final WhatsAppInboxRepository inbox;private final WhatsAppCredentialCodec codec;
    private final SalesConversationRepository repository;private final WhatsAppMessageStatusPolicy statuses;
    private final JdbcTemplate db;private final ObjectMapper json;private final WhatsAppProperties flags;private final Clock clock;
    public WhatsAppWebhookWorker(PlatformTransactionManager manager,WhatsAppInboxRepository inbox,WhatsAppCredentialCodec codec,SalesConversationRepository repository,WhatsAppMessageStatusPolicy statuses,JdbcTemplate db,ObjectMapper json,WhatsAppProperties flags,Clock clock,SalesConversationAttachmentRepository attachments,SalesConversationNotificationSource notices){this.notices=notices;this.attachments=attachments;this.tx=new TransactionTemplate(manager);this.inbox=inbox;this.codec=codec;this.repository=repository;this.statuses=statuses;this.db=db;this.json=json;this.flags=flags;this.clock=clock;}
    @Scheduled(fixedDelayString="${app.sales-conversations.poll-ms:3000}",initialDelayString="${app.sales-conversations.initial-delay-ms:30000}")
    public void poll(){if(flags.workerEnabled()&&flags.ingressEnabled())for(int i=0;i<25&&processOne();i++){} }
    public boolean processOne(){
        var job=tx.execute(s->inbox.next());if(job==null||job.isEmpty())return false;var j=job.get();
        try{tx.executeWithoutResult(s->{repository.lock(j.company());if(!inbox.owns(j))return;
            JsonNode event;try{event=json.readTree(codec.decrypt(j.company(),j.connection(),"inbox",j.payload()));}catch(Exception e){throw new IllegalStateException("Inbox content unavailable");}
            if(event.path("kind").asText().equals("messages"))inbound(j,event.path("event"));else statuses.record(j.company(),j.connection(),event.path("event"));
            db.update("UPDATE sales_wa_connections SET last_signal_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",j.company(),j.connection());inbox.complete(j);
        });}catch(RuntimeException failure){tx.executeWithoutResult(s->inbox.failed(j));}
        return true;
    }
    private void inbound(WhatsAppInboxRepository.Job j,JsonNode event){
        String peer=event.path("from").asText(),provider=event.path("id").asText(),phone;
        try{var util=PhoneNumberUtil.getInstance();var parsed=util.parse("+"+peer,null);if(!peer.matches("[1-9][0-9]{6,15}")||!util.isValidNumber(parsed))throw new IllegalArgumentException();phone=util.format(parsed,PhoneNumberUtil.PhoneNumberFormat.E164);}catch(Exception e){throw new IllegalArgumentException("Invalid provider peer");}
        Instant timestamp=Instant.ofEpochSecond(Long.parseLong(event.path("timestamp").asText()));
        if(timestamp.isAfter(clock.instant().plusSeconds(60))||timestamp.isBefore(Instant.parse("2000-01-01T00:00:00Z")))throw new IllegalArgumentException("Invalid provider time");
        if(db.queryForObject("SELECT COUNT(*) FROM sales_conversation_messages WHERE company_id=? AND connection_id=? AND provider_message_id=?",Integer.class,j.company(),j.connection(),provider)>0)return;
        var conversations=db.query("SELECT id,status FROM sales_conversations WHERE company_id=? AND connection_id=? AND peer_id=?",(r,n)->Map.entry(r.getString(1),r.getString(2)),j.company(),j.connection(),peer);
        String conversation=conversations.isEmpty()?UUID.randomUUID().toString():conversations.getFirst().getKey();
        if(conversations.isEmpty())db.update("INSERT INTO sales_conversations(company_id,id,connection_id,peer_id,phone_e164) VALUES(?,?,?,?,?)",j.company(),conversation,j.connection(),peer,phone);
        else if(conversations.getFirst().getValue().equals("RESOLVED"))repository.event(j.company(),j.connection(),conversation,null,"CUSTOMER_REOPENED",null,null);
        String type=event.path("type").asText();var media=event.path(type);
        String mime=media.path("mime_type").asText(),providerMedia=media.path("id").asText(),expectedHash=media.path("sha256").asText();
        boolean supportedMedia=Set.of("image","document").contains(type)&&SalesConversationFilePolicy.max(mime)>0&&providerMedia.matches("[0-9]{1,80}")&&expectedHash.length()<=128;
        String body="text".equals(type)?event.path("text").path("body").asText():supportedMedia?media.path("caption").asText():"";
        if(body.length()>4000)throw new IllegalArgumentException("Provider message too long");
        String message=UUID.randomUUID().toString();long seq=repository.event(j.company(),j.connection(),conversation,null,"CUSTOMER_MESSAGE",null,null);
        db.update("INSERT INTO sales_conversation_messages(company_id,id,conversation_id,connection_id,direction,message_type,body,provider_message_id,dispatch_state,recipient_snapshot,sender_snapshot,provider_timestamp,change_seq) SELECT ?,?,?,?,'IN',?,?,?,'RECEIVED',phone_number_id,?,?,? FROM sales_wa_connections WHERE company_id=? AND id=?",j.company(),message,conversation,j.connection(),"text".equals(type)?"TEXT":supportedMedia?type.equals("image")?"IMAGE":"DOCUMENT":"UNSUPPORTED",body,provider,peer,Timestamp.from(timestamp),seq,j.company(),j.connection());
        if(supportedMedia){String name=media.path("filename").asText();if(name.isBlank()||name.length()>180||name.matches(".*[\\r\\n\\x00/\\\\].*"))name=mime.equals("application/pdf")?"document.pdf":mime.equals("image/png")?"image.png":"image.jpg";
            attachments.inbound(j.company(),conversation,message,UUID.randomUUID().toString(),name,mime,providerMedia,expectedHash);}
        db.update("UPDATE sales_conversations SET status='OPEN',last_inbound_at=IF(last_inbound_at IS NULL,?,GREATEST(last_inbound_at,?)),last_activity_at=CURRENT_TIMESTAMP(6),version=version+1 WHERE company_id=? AND id=?",Timestamp.from(timestamp),Timestamp.from(timestamp),j.company(),conversation);
        notices.enqueue(j.company(),conversation,seq);
    }
}
