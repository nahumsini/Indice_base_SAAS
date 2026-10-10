package com.indice.erp.maintenance;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.storage.*;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.time.Instant;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static com.indice.erp.maintenance.MaintenanceDtos.*;

@SpringBootTest(properties={"app.email.enabled=false","app.maintenance.worker-initial-delay-ms=86400000","app.scheduling.reminder-initial-delay-ms=86400000","app.meetings.reminder-initial-delay-ms=86400000"})
@Transactional
class MaintenanceEvidenceIntegrationTest {
    @Autowired MaintenanceRepository db;
    @Autowired MaintenanceService service;
    @Autowired MaintenanceEvidenceService evidence;
    @MockitoBean ObjectStorageService storage;
    @MockitoBean CompanyStorageMeter meter;
    AuthSessionUser actor;long company,id;byte[] png;
    @BeforeEach void setup()throws Exception{
        assertThat(db.jdbc().queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        company=db.insert("INSERT INTO companies(name) VALUES(?)","Maintenance evidence "+UUID.randomUUID());long user=db.insert("INSERT INTO users(email,password_hash) VALUES(?,'synthetic-only')",UUID.randomUUID()+"@example.com");db.jdbc().update("INSERT INTO user_companies(company_id,user_id,role,status) VALUES(?,?,'superadmin','active')",company,user);db.jdbc().update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'maintenance','active','test')",company);actor=new AuthSessionUser(user,company,"Synthetic","superadmin");
        id=service.report(actor,new RequestInput(null,"Synthetic fault","Inspection","Workshop","NORMAL",""),UUID.randomUUID().toString()).request().id();
        var bytes=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB),"png",bytes);png=bytes.toByteArray();
        when(storage.isEnabled()).thenReturn(true);when(meter.presign(eq(company),eq("maintenance"),any(),anyString(),eq("image/png"),eq((long)png.length),eq(300))).thenAnswer(call->new PresignedUpload(call.getArgument(3),"https://storage.example.test/upload",Instant.now().plusSeconds(300),Map.of("Content-Type","image/png")));
        when(storage.objectMetadata(any(),anyString())).thenReturn(new StoredObjectMetadata(png.length,"image/png"));when(storage.readObjectPrefix(any(),anyString(),anyInt())).thenReturn(png);
    }
    @Test void registrationValidatesImmutableCopyAndRetryDoesNotDuplicateQuota(){
        var ticket=evidence.presign(actor,"REQUEST",id,new UploadInput("proof.png","image/png",png.length));
        var first=evidence.register(actor,"REQUEST",id,ticket.id());assertThat(first).hasSize(1);assertThat(evidence.register(actor,"REQUEST",id,ticket.id())).hasSize(1);
        var source=org.mockito.ArgumentCaptor.forClass(String.class);var target=org.mockito.ArgumentCaptor.forClass(String.class);verify(storage,times(1)).copyObject(any(),source.capture(),target.capture());assertThat(source.getValue()).contains("/staging/");assertThat(target.getValue()).contains("/evidence/");assertThat(target.getValue()).isNotEqualTo(source.getValue());
        verify(storage).readObjectPrefix(any(),eq(target.getValue()),eq(png.length+1));verify(meter,times(1)).commitMoved(eq(company),any(),eq(source.getValue()),eq(target.getValue()),eq((long)png.length));
    }
    @Test void substitutedContentIsRejectedWithoutRegisteringAnAttachment(){var ticket=evidence.presign(actor,"REQUEST",id,new UploadInput("proof.png","image/png",png.length));when(storage.readObjectPrefix(any(),anyString(),anyInt())).thenReturn(new byte[png.length]);assertThatThrownBy(()->evidence.register(actor,"REQUEST",id,ticket.id())).isInstanceOf(RuntimeException.class);assertThat(db.attachments(company,"REQUEST",id)).isEmpty();verify(meter,never()).commitMoved(anyLong(),any(),anyString(),anyString(),anyLong());verify(storage).deleteObject(any(),contains("/evidence/"));}
    @Test void anotherActorCannotRegisterTheUploadAndExpiryFailsClosed(){var ticket=evidence.presign(actor,"REQUEST",id,new UploadInput("proof.png","image/png",png.length));long second=db.insert("INSERT INTO users(email,password_hash) VALUES(?,'synthetic-only')",UUID.randomUUID()+"@example.com");db.jdbc().update("INSERT INTO user_companies(company_id,user_id,role,status) VALUES(?,?,'superadmin','active')",company,second);assertThatThrownBy(()->evidence.register(new AuthSessionUser(second,company,"Other","superadmin"),"REQUEST",id,ticket.id())).isInstanceOf(RuntimeException.class);db.jdbc().update("UPDATE maintenance_uploads SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 HOUR) WHERE company_id=? AND id=?",company,ticket.id());assertThatThrownBy(()->evidence.register(actor,"REQUEST",id,ticket.id())).hasMessageContaining("upload_expired");verify(storage,never()).copyObject(any(),anyString(),anyString());}
}
