package com.indice.erp.files;
import java.util.*;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
@Repository
public class FileRepository {
 final JdbcTemplate db;public FileRepository(JdbcTemplate db){this.db=db;}
 record Row(String id,String parent,long owner,String ownerName,String kind,String name,String type,long size,String key,String status,boolean trashed,long version,Instant updated,String creationDigest,String mutation,String digest){}
 record Permission(String entry,long user,int level){}
 public JdbcTemplate jdbc(){return db;}
 Map<String,Row> rows(long company){var result=new LinkedHashMap<String,Row>();db.query("SELECT e.*,u.full_name owner_name FROM file_library_entries e JOIN users u ON u.id=e.owner_user_id WHERE e.company_id=? ORDER BY e.created_at,e.id LIMIT 5001",(r,n)->new Row(r.getString("id"),r.getString("parent_id"),r.getLong("owner_user_id"),r.getString("owner_name"),r.getString("kind"),r.getString("name"),r.getString("content_type"),r.getLong("size_bytes"),r.getString("object_key"),r.getString("status"),r.getTimestamp("trashed_at")!=null,r.getLong("version"),r.getTimestamp("updated_at").toInstant(),r.getString("creation_digest"),r.getString("last_mutation_id"),r.getString("last_digest")),company).forEach(row->result.put(row.id(),row));return result;}
 List<Permission> grants(long company){return db.query("SELECT entry_id,user_id,permission_level FROM file_library_grants WHERE company_id=?",(r,n)->new Permission(r.getString(1),r.getLong(2),r.getInt(3)),company);}
 void audit(long company,long user,String entry,String action,long version){db.update("INSERT INTO file_library_audit(company_id,actor_id,entry_id,action,version) VALUES(?,?,?,?,?)",company,user,entry,action,version);}
}
