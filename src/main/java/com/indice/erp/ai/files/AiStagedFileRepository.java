package com.indice.erp.ai.files;

import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static com.indice.erp.ai.files.AiFileContracts.*;

@Repository
public class AiStagedFileRepository {
    private final JdbcTemplate jdbc;
    public AiStagedFileRepository(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public record Stored(Staged view,String objectKey,String bucket,String state,String fingerprint,Long attachmentId) { }
    private static final org.springframework.jdbc.core.RowMapper<Stored> ROW=(rs,n)->new Stored(
        new Staged(rs.getString("id"),Purpose.valueOf(rs.getString("purpose")),rs.getLong("target_id"),rs.getString("document_type"),
            rs.getString("original_filename"),rs.getString("mime_type"),rs.getLong("size_bytes"),rs.getString("sha256"),rs.getTimestamp("expires_at").toInstant()),
        rs.getString("object_key"),rs.getString("bucket_name"),rs.getString("state"),rs.getString("request_fingerprint"),(Long)rs.getObject("attachment_id"));
    public Optional<Stored> byKey(StoredToken token,String hash) {
        return jdbc.query("SELECT * FROM ai_staged_files WHERE access_token_id=? AND company_id=? AND user_company_id=? AND idempotency_key_hash=?",ROW,token.id(),token.user().companyId(),token.user().userCompanyId(),hash).stream().findFirst();
    }
    public Stored require(StoredToken token,String id,boolean lock) {
        if(id==null||!id.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"))throw new IllegalArgumentException("A valid staged file ID is required.");
        return jdbc.query("SELECT * FROM ai_staged_files WHERE id=? AND access_token_id=? AND company_id=? AND user_id=? AND user_company_id=?"+(lock?" FOR UPDATE":""),
            ROW,id,token.id(),token.user().companyId(),token.user().userId(),token.user().userCompanyId()).stream().findFirst().orElseThrow(()->new NoSuchElementException("Staged file not found."));
    }
    public void insert(StoredToken token,Staged file,String key,String bucket,String idempotencyHash,String fingerprint) {
        jdbc.update("INSERT INTO ai_staged_files (id,access_token_id,company_id,user_id,user_company_id,purpose,target_id,document_type,original_filename,mime_type,size_bytes,sha256,object_key,bucket_name,idempotency_key_hash,request_fingerprint,state,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'UPLOADING',?)",
            file.stagedFileId(),token.id(),token.user().companyId(),token.user().userId(),token.user().userCompanyId(),file.purpose().name(),file.targetId(),file.documentType(),file.fileName(),file.mimeType(),file.sizeBytes(),file.sha256(),key,bucket,idempotencyHash,fingerprint,Timestamp.from(file.expiresAt()));
    }
    public void ready(String id) { if(jdbc.update("UPDATE ai_staged_files SET state='STAGED' WHERE id=? AND state='UPLOADING'",id)!=1)throw new Conflict("file_intake_unavailable"); }
    public void attached(String id,long attachment) { if(jdbc.update("UPDATE ai_staged_files SET state='ATTACHED',attachment_id=?,attached_at=CURRENT_TIMESTAMP(6) WHERE id=? AND state='STAGED'",attachment,id)!=1)throw new Conflict("file_already_attached"); }
    public void expired(String id) { jdbc.update("UPDATE ai_staged_files SET state='EXPIRED' WHERE id=? AND state IN ('UPLOADING','STAGED')",id); }
    public record Expiring(String id,long companyId,String bucket,String key) { }
    public List<Expiring> expiredCandidates(Instant now) {
        return jdbc.query("SELECT id,company_id,bucket_name,object_key FROM ai_staged_files WHERE state IN ('UPLOADING','STAGED') AND expires_at<=? ORDER BY expires_at LIMIT 100 FOR UPDATE SKIP LOCKED",
            (rs,n)->new Expiring(rs.getString("id"),rs.getLong("company_id"),rs.getString("bucket_name"),rs.getString("object_key")),Timestamp.from(now));
    }
}
