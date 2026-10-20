package com.indice.erp.sales.funneling;

import static com.indice.erp.sales.funneling.IdeasBoardContracts.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class IdeasBoardRepository {
    public record Row(Board board,String mutationId,String digest) { }
    private final JdbcTemplate db; private final ObjectMapper mapper;
    public IdeasBoardRepository(JdbcTemplate db,ObjectMapper mapper) { this.db=db;this.mapper=mapper; }
    public void lock(AuthSessionUser actor) {
        var rows=db.queryForList("SELECT id FROM user_companies WHERE company_id=? AND user_id=? AND status='active' FOR UPDATE",actor.companyId(),actor.userId());
        if(rows.isEmpty())throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN);
    }
    public Optional<Row> find(AuthSessionUser a) { return find(a,IdeasBoardScope.FUNNEL); }
    public Optional<Row> find(AuthSessionUser a,IdeasBoardScope scope) {
        return db.query("SELECT content_json,version,updated_at,last_mutation_id,content_digest FROM "+scope.boards()+" WHERE company_id=? AND user_id=?",(r,n)->new Row(new Board(decode(r.getString("content_json")),r.getLong("version"),r.getTimestamp("updated_at").toInstant(),key(a,scope)),r.getString("last_mutation_id"),r.getString("content_digest")),a.companyId(),a.userId()).stream().findFirst();
    }
    public void initialize(AuthSessionUser a) { initialize(a,IdeasBoardScope.FUNNEL); }
    public void initialize(AuthSessionUser a,IdeasBoardScope scope) {
        db.update("INSERT IGNORE INTO "+scope.boards()+"(company_id,user_id,content_json,version,content_digest) VALUES(?,?,?,0,'')",a.companyId(),a.userId(),encode(empty()));
    }
    public void save(AuthSessionUser a,Input input,String digest) { save(a,input,digest,IdeasBoardScope.FUNNEL); }
    public void save(AuthSessionUser a,Input input,String digest,IdeasBoardScope scope) {
        initialize(a,scope);
        int changed=db.update("UPDATE "+scope.boards()+" SET content_json=?,version=version+1,last_mutation_id=?,content_digest=?,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND user_id=? AND version=?",encode(input.content()),input.mutationId(),digest,a.companyId(),a.userId(),input.version());
        if(changed!=1)throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"ideas_board_conflict");
        db.update("INSERT INTO "+scope.audit()+"(company_id,user_id,version,node_count,connection_count) VALUES(?,?,?,?,?)",a.companyId(),a.userId(),input.version()+1,input.content().nodes().size(),input.content().connections().size());
    }
    public Optional<StoredAsset> asset(AuthSessionUser a,String id) { return asset(a,id,IdeasBoardScope.FUNNEL); }
    public Optional<StoredAsset> asset(AuthSessionUser a,String id,IdeasBoardScope scope) {
        return db.query("SELECT id,file_name,content_type,size_bytes,object_key,content_digest FROM "+scope.assets()+" WHERE company_id=? AND user_id=? AND id=?",(r,n)->new StoredAsset(new Asset(r.getString("id"),r.getString("file_name"),r.getString("content_type"),r.getLong("size_bytes")),r.getString("object_key"),r.getString("content_digest")),a.companyId(),a.userId(),id).stream().findFirst();
    }
    public long assetCount(AuthSessionUser a) { return assetCount(a,IdeasBoardScope.FUNNEL); }
    public long assetCount(AuthSessionUser a,IdeasBoardScope scope) { return db.queryForObject("SELECT COUNT(*) FROM "+scope.assets()+" WHERE company_id=? AND user_id=?",Long.class,a.companyId(),a.userId()); }
    public void insertAsset(AuthSessionUser a,StoredAsset row) { insertAsset(a,row,IdeasBoardScope.FUNNEL); }
    public void insertAsset(AuthSessionUser a,StoredAsset row,IdeasBoardScope scope) {
        initialize(a,scope);var f=row.asset();db.update("INSERT INTO "+scope.assets()+"(company_id,user_id,id,file_name,content_type,size_bytes,object_key,content_digest) VALUES(?,?,?,?,?,?,?,?)",a.companyId(),a.userId(),f.id(),f.name(),f.contentType(),f.size(),row.objectKey(),row.digest());
    }
    public String encode(Document content) { try { return mapper.writeValueAsString(content); } catch(JsonProcessingException e) { throw new IllegalStateException("Unable to encode ideas board",e); } }
    private Document decode(String content) { try { return mapper.readValue(content,Document.class); } catch(JsonProcessingException e) { throw new IllegalStateException("Invalid stored ideas board",e); } }
    public static String key(AuthSessionUser a) { return key(a,IdeasBoardScope.FUNNEL); }
    public static String key(AuthSessionUser a,IdeasBoardScope scope) { return scope.actorPrefix()+a.companyId()+":"+a.userId(); }
}
