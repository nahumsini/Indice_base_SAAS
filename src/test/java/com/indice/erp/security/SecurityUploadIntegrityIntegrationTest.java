package com.indice.erp.security;

import static org.assertj.core.api.Assertions.*;
import com.indice.erp.billing.storage.*;
import com.indice.erp.finance.attachments.FinanceAttachmentSealer;
import com.indice.erp.hr.attendance.application.AttendancePhotoService;
import com.indice.erp.storage.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.*;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties={"app.email.enabled=false","app.entitlements.projection-enabled=false","app.mail-accounts.worker-enabled=false","app.mailing.worker-enabled=false","app.billing.storage.cleanup-delay-ms=86400000","app.finance.attachments.cleanup-delay-ms=86400000"})
class SecurityUploadIntegrityIntegrationTest {
    @TestConfiguration static class Configuration {
        @Bean @Primary MemoryStorage memoryStorage(){return new MemoryStorage();}
    }
    @Autowired JdbcTemplate db;
    @Autowired FinanceAttachmentSealer sealer;
    @Autowired AttendancePhotoService photos;
    @Autowired MemoryStorage storage;
    @Autowired StorageQuotaService quota;
    @Autowired ObjectStorageProperties properties;
    @Autowired PlatformTransactionManager manager;
    long company,foreign;
    TransactionTemplate tx;
    @BeforeEach void setup(){
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        tx=new TransactionTemplate(manager);company=company();foreign=company();quota.initializeCompany(company);quota.initializeCompany(foreign);
    }
    long company(){String name="Upload security "+UUID.randomUUID();db.update("INSERT INTO companies(name) VALUES(?)",name);return db.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,name);}
    String bucket(){return properties.getMinio().getBucketDocuments();}
    String staging(){return "finance/expenses/"+company+"/99/attachments/"+UUID.randomUUID()+".pdf";}
    PresignedUpload prepare(String key){return tx.execute(t->sealer.presign(company,"EXPENSE",99,bucket(),key,"application/pdf",4,900));}
    @Test void reusableBrowserUploadCannotReplaceSealedEvidenceAndReplayKeepsTheSameDigest(){
        String source=staging();prepare(source);storage.writeObject(bucket(),source,"application/pdf",new byte[]{1,2,3,4});
        var sealed=tx.execute(t->sealer.seal(company,"EXPENSE",99,bucket(),source,"application/pdf",4));
        assertThat(sealed.key()).isNotEqualTo(source);assertThat(sealed.sha256()).hasSize(64);
        storage.writeObject(bucket(),source,"application/pdf",new byte[]{9,9,9,9});
        assertThat(storage.readObject(bucket(),sealed.key(),10)).containsExactly(1,2,3,4);
        var replay=tx.execute(t->sealer.seal(company,"EXPENSE",99,bucket(),source,"application/pdf",4));
        assertThat(replay).isEqualTo(sealed);
        assertThat(db.queryForObject("SELECT object_key FROM company_storage_objects WHERE company_id=? AND status='COMMITTED'",String.class,company)).isEqualTo(sealed.key());
        assertThatThrownBy(()->tx.execute(t->sealer.seal(foreign,"EXPENSE",99,bucket(),source,"application/pdf",4))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->tx.execute(t->sealer.seal(company,"BUDGET_LINE",99,bucket(),source,"application/pdf",4))).isInstanceOf(IllegalArgumentException.class);
        db.update("UPDATE finance_attachment_uploads SET upload_expires_at=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 1 MINUTE) WHERE company_id=?",company);
        sealer.cleanupExpiredUploads();assertThat(storage.objectExists(bucket(),source)).isFalse();
        assertThat(storage.objectExists(bucket(),sealed.key())).isTrue();
    }
    @Test void mismatchedBytesNeverBecomeRegisteredEvidence(){
        String source=staging();prepare(source);storage.writeObject(bucket(),source,"application/pdf",new byte[]{1,2,3});
        assertThatThrownBy(()->tx.execute(t->sealer.seal(company,"EXPENSE",99,bucket(),source,"application/pdf",4))).isInstanceOf(IllegalArgumentException.class);
        assertThat(db.queryForObject("SELECT state FROM finance_attachment_uploads WHERE company_id=? AND staging_key=?",String.class,company,source)).isEqualTo("PENDING");
        assertThat(storage.files.keySet().stream().filter(k->k.contains("/"+company+"/") && k.contains("/sealed/"))).isEmpty();
    }
    @Test void rollbackDeletesTheDefinitiveCopyAndLeavesTheReservationRetryable(){
        String source=staging();prepare(source);storage.writeObject(bucket(),source,"application/pdf",new byte[]{1,2,3,4});
        final String[] target={null};
        assertThatThrownBy(()->tx.execute(t->{target[0]=sealer.seal(company,"EXPENSE",99,bucket(),source,"application/pdf",4).key();throw new IllegalStateException("synthetic owner failure");})).isInstanceOf(IllegalStateException.class);
        assertThat(storage.objectExists(bucket(),target[0])).isFalse();
        assertThat(db.queryForObject("SELECT state FROM finance_attachment_uploads WHERE company_id=?",String.class,company)).isEqualTo("PENDING");
        assertThat(db.queryForObject("SELECT status FROM company_storage_objects WHERE company_id=?",String.class,company)).isEqualTo("RESERVED");
    }
    @Test void photosReserveExactBytesThenCommitOnlyAValidOwnedUpload(){
        String attendanceBucket=properties.getMinio().getBucketAttendance();
        var value=photos.createAttendanceUpload(company,88,"image/jpeg","check_in",LocalDate.now(),4);
        String key=(String)value.get("object_key");
        assertThat(db.queryForObject("SELECT reserved_bytes FROM company_storage_states WHERE company_id=?",Long.class,company)).isEqualTo(4);
        assertThat(((Map<?,?>)value.get("upload_headers")).get("Content-Length")).isEqualTo("4");
        storage.writeObject(attendanceBucket,key,"image/jpeg",new byte[]{1,2,3,4});
        assertThatThrownBy(()->photos.normalizeAttendancePhotoObjectKey(foreign,88,key)).isInstanceOf(IllegalArgumentException.class);
        assertThat(photos.normalizeAttendancePhotoObjectKey(company,88,key)).isEqualTo(key);
        assertThat(db.queryForObject("SELECT used_bytes FROM company_storage_states WHERE company_id=?",Long.class,company)).isEqualTo(4);
        assertThat(db.queryForObject("SELECT reserved_bytes FROM company_storage_states WHERE company_id=?",Long.class,company)).isZero();
    }
    @Test void abandonedPhotosExpireAndMismatchedSizesStayUncommitted(){
        String attendanceBucket=properties.getMinio().getBucketAttendance();
        var value=photos.createAttendanceUpload(company,89,"image/jpeg","check_in",LocalDate.now(),4);String key=(String)value.get("object_key");
        storage.writeObject(attendanceBucket,key,"image/jpeg",new byte[]{1,2,3});
        assertThatThrownBy(()->photos.normalizeAttendancePhotoObjectKey(company,89,key)).isInstanceOf(IllegalArgumentException.class);
        db.update("UPDATE company_storage_objects SET expires_at=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 1 MINUTE) WHERE company_id=? AND status='RESERVED'",company);
        quota.expireReservations();assertThat(storage.objectExists(attendanceBucket,key)).isFalse();
        assertThat(db.queryForObject("SELECT reserved_bytes FROM company_storage_states WHERE company_id=?",Long.class,company)).isZero();
        assertThatThrownBy(()->photos.createAttendanceUpload(company,89,"image/jpeg","check_in",LocalDate.now(),0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->photos.createAttendanceUpload(company,89,"image/jpeg","check_in",LocalDate.now(),6*1024*1024)).isInstanceOf(IllegalArgumentException.class);
    }
    static class MemoryStorage implements ObjectStorageService {
        record File(String type,byte[] bytes){}
        final Map<String,File> files=new ConcurrentHashMap<>();
        String id(String bucket,String key){return bucket+":"+key;}
        public boolean isEnabled(){return true;}public void validateConfiguration(){}public void ensureBucketExists(String bucket){}
        public PresignedUpload presignUpload(String b,String k,String t,int e){throw new AssertionError("Exact content length required");}
        public PresignedUpload presignUpload(String b,String k,String t,long s,int e){return new PresignedUpload(k,"http://127.0.0.1/synthetic",Instant.now().plusSeconds(e),Map.of("Content-Type",t,"Content-Length",Long.toString(s)));}
        public boolean objectExists(String b,String k){return files.containsKey(id(b,k));}
        public StoredObjectMetadata objectMetadata(String b,String k){var f=files.get(id(b,k));return new StoredObjectMetadata(f.bytes().length,f.type());}
        public byte[] readObjectPrefix(String b,String k,int m){return Arrays.copyOf(files.get(id(b,k)).bytes(),Math.min(m,files.get(id(b,k)).bytes().length));}
        public byte[] readObject(String b,String k,int m){var f=files.get(id(b,k));if(f.bytes().length>m)throw new IllegalArgumentException();return f.bytes().clone();}
        public void writeObject(String b,String k,String t,byte[] bytes){files.put(id(b,k),new File(t,bytes.clone()));}
        public void copyObject(String b,String s,String t){files.put(id(b,t),files.get(id(b,s)));}
        public void moveObject(String b,String s,String t){copyObject(b,s,t);deleteObject(b,s);}
        public String presignDownload(String b,String k,int e){return "http://127.0.0.1/synthetic-download";}
        public String presignServiceDownload(String b,String k,int e){return presignDownload(b,k,e);}
        public void deleteObject(String b,String k){files.remove(id(b,k));}
    }
}
