package com.indice.erp.sales.mailing;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import com.indice.erp.config.AppWebProperties;
import com.indice.erp.billing.BillingHashing;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.sales.mailing.MailingDeliveryAccess.require;
import static org.springframework.http.HttpStatus.*;
@Service
public class MailingUnsubscribeService {
    private final byte[] key;private final AppWebProperties web;private final MailingDeliveryRepository repository;private final JdbcTemplate db;
    public MailingUnsubscribeService(@Value("${app.mail-accounts.encryption-key:}")String encoded,AppWebProperties web,MailingDeliveryRepository repository,JdbcTemplate db){this.key=encoded.isBlank()?null:Base64.getDecoder().decode(encoded);this.web=web;this.repository=repository;this.db=db;}
    public boolean available(){try{var uri=java.net.URI.create(web.getPublicUrl());return key!=null&&"https".equals(uri.getScheme())&&uri.getHost()!=null&&uri.getHost().matches("(?i)[a-z0-9.-]+\\.[a-z]{2,}")&&!uri.getHost().endsWith(".localhost")&&!uri.getHost().endsWith(".local")&&uri.getUserInfo()==null&&uri.getRawQuery()==null&&uri.getRawFragment()==null;}catch(Exception e){return false;}}
    private String signature(String id){try{var mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(key,"HmacSHA256"));return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(("indice-mailing-unsubscribe-v1:"+id).getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException("mailing_link_unavailable");}}
    String link(String id){require(available(),CONFLICT,"mailing_public_url_required");return web.getPublicUrl()+"/mailing/unsubscribe#"+id+"."+signature(id);}
    @Transactional public void unsubscribe(String token,String network){
        // This purpose reuses the durable auth bucket store; raw addresses/tokens never enter logs.
        String hash=BillingHashing.sha256("mailing-unsubscribe:"+network);
        db.update("INSERT IGNORE INTO auth_rate_limit_buckets(purpose,rate_limit_key_hash,email_normalized,company_name_normalized,request_count,window_started_at,window_ends_at) VALUES('MAILING_UNSUBSCRIBE',?,'','',0,CURRENT_TIMESTAMP(6),CURRENT_TIMESTAMP(6)+INTERVAL 10 MINUTE)",hash);
        db.queryForObject("SELECT request_count FROM auth_rate_limit_buckets WHERE purpose='MAILING_UNSUBSCRIBE' AND rate_limit_key_hash=? FOR UPDATE",Integer.class,hash);
        int count=db.update("UPDATE auth_rate_limit_buckets SET request_count=IF(window_ends_at<CURRENT_TIMESTAMP(6),1,request_count+1),window_started_at=IF(window_ends_at<CURRENT_TIMESTAMP(6),CURRENT_TIMESTAMP(6),window_started_at),window_ends_at=IF(window_ends_at<CURRENT_TIMESTAMP(6),CURRENT_TIMESTAMP(6)+INTERVAL 10 MINUTE,window_ends_at) WHERE purpose='MAILING_UNSUBSCRIBE' AND rate_limit_key_hash=? AND (request_count<60 OR window_ends_at<CURRENT_TIMESTAMP(6))",hash);
        require(count>0,TOO_MANY_REQUESTS,"mailing_rate_limited");
        if(key==null||token==null||!token.matches("[a-f0-9-]{36}\\.[A-Za-z0-9_-]{43}"))return;
        String id=token.substring(0,36);if(!MessageDigest.isEqual(signature(id).getBytes(StandardCharsets.US_ASCII),token.substring(37).getBytes(StandardCharsets.US_ASCII)))return;
        repository.suppress(id);
    }
}
