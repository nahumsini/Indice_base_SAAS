package com.indice.erp.ideasboard;

import static com.indice.erp.ideasboard.IdeaWorkspaceContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class IdeaWorkspaceRepository {
    public record SystemRow(SystemBoard board,String mutationId,String digest) {}
    public record ProjectRow(Project project,String digest) {}
    private final JdbcTemplate db; private final ObjectMapper mapper;
    public IdeaWorkspaceRepository(JdbcTemplate db,ObjectMapper mapper) { this.db=db;this.mapper=mapper; }
    public Optional<SystemRow> system(AuthSessionUser a) {
        return db.query("SELECT content_json,version,last_mutation_id,content_digest,updated_at FROM personal_system_boards WHERE company_id=? AND user_id=?",(r,n)->new SystemRow(new SystemBoard(decode(r.getString(1),SystemDocument.class),r.getLong(2),r.getTimestamp(5).toInstant(),actor(a)),r.getString(3),r.getString(4)),a.companyId(),a.userId()).stream().findFirst();
    }
    public boolean saveSystem(AuthSessionUser a,SystemInput input,String digest) {
        db.update("INSERT IGNORE INTO personal_system_boards(company_id,user_id,content_json,content_digest) VALUES(?,?,?,'')",a.companyId(),a.userId(),encode(emptySystem()));
        return db.update("UPDATE personal_system_boards SET content_json=?,content_digest=?,last_mutation_id=?,version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND user_id=? AND version=?",encode(input.content()),digest,input.mutationId(),a.companyId(),a.userId(),input.version())==1;
    }
    private ProjectSummary summary(java.sql.ResultSet r) throws java.sql.SQLException { return new ProjectSummary(r.getString("project_id"),r.getString("name"),r.getString("kind"),r.getInt("node_count"),r.getInt("connection_count"),r.getTimestamp("created_at").toInstant()); }
    public Optional<ProjectRow> project(AuthSessionUser a,String id) {
        return db.query("SELECT * FROM personal_idea_projects WHERE company_id=? AND user_id=? AND project_id=?",(r,n)->{
            var input=decode(r.getString("content_json"),ProjectInput.class);
            return new ProjectRow(new Project(summary(r),input.freeform(),input.system()),r.getString("content_digest"));
        },a.companyId(),a.userId(),id).stream().findFirst();
    }
    public long count(AuthSessionUser a) { return db.queryForObject("SELECT COUNT(*) FROM personal_idea_projects WHERE company_id=? AND user_id=? AND deleted_at IS NULL",Long.class,a.companyId(),a.userId()); }
    public ProjectPage projects(AuthSessionUser a,String search,int page,int size) {
        String pattern="%"+search.toLowerCase(java.util.Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%";
        String where=" WHERE company_id=? AND user_id=? AND deleted_at IS NULL AND LOWER(name) LIKE ? ESCAPE '!'";
        long total=db.queryForObject("SELECT COUNT(*) FROM personal_idea_projects"+where,Long.class,a.companyId(),a.userId(),pattern);
        var rows=db.query("SELECT project_id,name,kind,node_count,connection_count,created_at FROM personal_idea_projects"+where+" ORDER BY created_at DESC,project_id DESC LIMIT ? OFFSET ?",(r,n)->summary(r),a.companyId(),a.userId(),pattern,size,(page-1)*size);
        return new ProjectPage(rows,total,page,size);
    }
    public void insert(AuthSessionUser a,String id,ProjectInput input,String digest,int nodes,int connections) {
        db.update("INSERT INTO personal_idea_projects(company_id,user_id,project_id,name,kind,content_json,content_digest,node_count,connection_count) VALUES(?,?,?,?,?,?,?,?,?)",a.companyId(),a.userId(),id,input.name(),input.kind(),encode(input),digest,nodes,connections);
    }
    public void audit(AuthSessionUser a,String event,String id,int nodes,int connections) {
        db.update("INSERT INTO personal_idea_workspace_audit(company_id,user_id,event_type,project_id,node_count,connection_count) VALUES(?,?,?,?,?,?)",a.companyId(),a.userId(),event,id,nodes,connections);
    }
    public String encode(Object value) { try { return mapper.writeValueAsString(value); } catch(JsonProcessingException error) { throw new IllegalStateException("Cannot encode idea workspace",error); } }
    private <T> T decode(String value,Class<T> type) { try { return mapper.readValue(value,type); } catch(JsonProcessingException error) { throw new IllegalStateException("Cannot read idea workspace",error); } }
    public static String actor(AuthSessionUser a) { return "ideas_board:"+a.companyId()+":"+a.userId(); }
}
