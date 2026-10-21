package com.indice.erp.ideasboard;

import static com.indice.erp.ideasboard.IdeaWorkspaceContracts.*;
import static com.indice.erp.ideasboard.IdeaProjectContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class IdeaProjectRepository {
    public record Row(long owner,ProjectInput input,ProjectSummary summary,String mutation,String digest,
        Long copyOwner,String copyId,String copyDigest) {}
    private final JdbcTemplate db;private final ObjectMapper mapper;
    public IdeaProjectRepository(JdbcTemplate db,ObjectMapper mapper){this.db=db;this.mapper=mapper;}
    private static final String SELECT="""
        SELECT p.*,COALESCE(NULLIF(u.full_name,''),'User') owner_name,
        (SELECT COUNT(*) FROM personal_idea_project_shares s WHERE s.company_id=p.company_id
         AND s.owner_user_id=p.user_id AND s.project_id=p.project_id AND s.revoked_at IS NULL) share_count
        FROM personal_idea_projects p JOIN users u ON u.id=p.user_id
        """;
    private ProjectSummary summary(ResultSet r,long viewer)throws SQLException {
        var deleted=r.getTimestamp("deleted_at");long owner=r.getLong("user_id");
        return new ProjectSummary(r.getString("project_id"),r.getString("name"),r.getString("kind"),r.getInt("node_count"),r.getInt("connection_count"),r.getTimestamp("created_at").toInstant(),r.getLong("management_version"),owner==viewer,owner,r.getString("owner_name"),deleted==null?null:deleted.toInstant(),owner==viewer?r.getInt("share_count"):null);
    }
    public Optional<Row> find(AuthSessionUser a,long owner,String id,boolean lock) {
        return db.query(SELECT+" WHERE p.company_id=? AND p.user_id=? AND p.project_id=?"+(lock?" FOR UPDATE":""),(r,n)->{
            try{return new Row(owner,mapper.readValue(r.getString("content_json"),ProjectInput.class),summary(r,a.userId()),r.getString("last_management_mutation"),r.getString("last_management_digest"),(Long)r.getObject("copy_source_owner"),r.getString("copy_source_id"),r.getString("copy_request_digest"));}
            catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("Cannot read idea project",e);}
        },a.companyId(),owner,id).stream().findFirst();
    }
    public boolean granted(AuthSessionUser a,long owner,String id){return db.queryForObject("""
        SELECT COUNT(*) FROM personal_idea_project_shares s
        JOIN user_companies uc ON uc.company_id=s.company_id AND uc.user_id=s.owner_user_id AND uc.status='active'
        WHERE s.company_id=? AND s.owner_user_id=? AND s.project_id=? AND s.recipient_user_id=? AND s.revoked_at IS NULL
        """,Long.class,a.companyId(),owner,id,a.userId())>0;}
    public ProjectPage list(AuthSessionUser a,String search,int page,int size,String scope){
        var args=new ArrayList<Object>(List.of(a.companyId(),a.userId()));
        String where=" WHERE p.company_id=? AND "+switch(scope){
            case "OWNED"->"p.user_id=? AND p.deleted_at IS NULL";
            case "TRASH"->"p.user_id=? AND p.deleted_at IS NOT NULL";
            default->"p.user_id<>? AND p.deleted_at IS NULL AND EXISTS(SELECT 1 FROM personal_idea_project_shares s WHERE s.company_id=p.company_id AND s.owner_user_id=p.user_id AND s.project_id=p.project_id AND s.recipient_user_id=? AND s.revoked_at IS NULL) AND EXISTS(SELECT 1 FROM user_companies uc WHERE uc.company_id=p.company_id AND uc.user_id=p.user_id AND uc.status='active')";
        };
        if("SHARED".equals(scope))args.add(a.userId());
        String pattern="%"+search.toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%";
        where+=" AND LOWER(p.name) LIKE ? ESCAPE '!'";
        args.add(pattern);
        long total=db.queryForObject("SELECT COUNT(*) FROM personal_idea_projects p"+where,Long.class,args.toArray());
        args.add(size);args.add((page-1)*size);
        var items=db.query(SELECT+where+" ORDER BY p.created_at DESC,p.project_id DESC,p.user_id DESC LIMIT ? OFFSET ?",(r,n)->summary(r,a.userId()),args.toArray());
        return new ProjectPage(items,total,page,size);
    }
    public List<AuthSessionUser> candidates(AuthSessionUser a,String query){
        String pattern="%"+query.toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%";
        return db.query("""
            SELECT uc.id,uc.user_id,uc.role,COALESCE(NULLIF(u.full_name,''),'User') name
            FROM user_companies uc JOIN users u ON u.id=uc.user_id
            WHERE uc.company_id=? AND uc.status='active' AND uc.user_id<>? AND LOWER(COALESCE(u.full_name,'')) LIKE ? ESCAPE '!'
            ORDER BY u.full_name,uc.id DESC LIMIT 200
            """,(r,n)->new AuthSessionUser(r.getLong("user_id"),a.companyId(),r.getLong("id"),r.getString("name"),r.getString("role")),a.companyId(),a.userId(),pattern);
    }
    public Optional<AuthSessionUser> member(AuthSessionUser a,long user){return db.query("""
        SELECT uc.id,uc.role,COALESCE(NULLIF(u.full_name,''),'User') name FROM user_companies uc JOIN users u ON u.id=uc.user_id
        WHERE uc.company_id=? AND uc.user_id=? AND uc.status='active' ORDER BY uc.id DESC LIMIT 1
        """,(r,n)->new AuthSessionUser(user,a.companyId(),r.getLong("id"),r.getString("name"),r.getString("role")),a.companyId(),user).stream().findFirst();}
    public List<Member> shares(AuthSessionUser a,String id){return db.query("""
        SELECT s.recipient_user_id,COALESCE(NULLIF(u.full_name,''),'User') name FROM personal_idea_project_shares s JOIN users u ON u.id=s.recipient_user_id
        WHERE s.company_id=? AND s.owner_user_id=? AND s.project_id=? AND s.revoked_at IS NULL ORDER BY u.full_name,s.recipient_user_id
        """,(r,n)->new Member(r.getLong(1),r.getString(2),true),a.companyId(),a.userId(),id);}
    public void setShares(AuthSessionUser a,String id,Set<Long> users){
        db.update("UPDATE personal_idea_project_shares SET revoked_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND owner_user_id=? AND project_id=? AND revoked_at IS NULL",a.companyId(),a.userId(),id);
        for(long user:users)db.update("""
            INSERT INTO personal_idea_project_shares(company_id,owner_user_id,project_id,recipient_user_id) VALUES(?,?,?,?)
            ON DUPLICATE KEY UPDATE revoked_at=NULL,created_at=CURRENT_TIMESTAMP(6)
            """,a.companyId(),a.userId(),id,user);
    }
    public void rename(AuthSessionUser a,String id,String name){db.update("UPDATE personal_idea_projects SET name=? WHERE company_id=? AND user_id=? AND project_id=?",name,a.companyId(),a.userId(),id);}
    public void trash(AuthSessionUser a,String id,boolean trashed){db.update("UPDATE personal_idea_projects SET deleted_at="+(trashed?"CURRENT_TIMESTAMP(6)":"NULL")+" WHERE company_id=? AND user_id=? AND project_id=?",a.companyId(),a.userId(),id);if(trashed)setShares(a,id,Set.of());}
    public void finish(AuthSessionUser a,String id,String mutation,String digest){db.update("UPDATE personal_idea_projects SET management_version=management_version+1,last_management_mutation=?,last_management_digest=? WHERE company_id=? AND user_id=? AND project_id=?",mutation,digest,a.companyId(),a.userId(),id);}
    public void copySource(AuthSessionUser a,String id,long owner,String source,String digest){db.update("UPDATE personal_idea_projects SET copy_source_owner=?,copy_source_id=?,copy_request_digest=? WHERE company_id=? AND user_id=? AND project_id=?",owner,source,digest,a.companyId(),a.userId(),id);}
}
