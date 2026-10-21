package com.indice.erp.sales.funneling;

import com.indice.erp.auth.*;
import com.indice.erp.ideasboard.*;
import static com.indice.erp.ideasboard.IdeaWorkspaceContracts.*;
import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.sales.funneling.IdeasBoardContracts.*;
import static com.indice.erp.sales.funneling.IdeasBoardScope.PERSONAL;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.email.enabled=false","app.mail-accounts.worker-enabled=false","app.mailing.worker-enabled=false"})
@AutoConfigureMockMvc
@Transactional
class CreativeRecoveryIntegrationTest {
    static final String URL="/api/v1/ideas-board";
    @Autowired JdbcTemplate db;
    @Autowired IdeasBoardService service;
    @Autowired IdeaWorkspaceService workspace;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired ObjectStorageProperties properties;
    @MockitoBean ObjectStorageService storage;
    @MockitoBean CompanyStorageMeter meter;
    long company,other,user,membership;
    AuthSessionUser actor;
    long insert(String sql,Object... args) {
        var key=new GeneratedKeyHolder();db.update(connection->{var statement=connection.prepareStatement(sql,java.sql.Statement.RETURN_GENERATED_KEYS);for(int i=0;i<args.length;i++)statement.setObject(i+1,args[i]);return statement;},key);return key.getKey().longValue();
    }
    @BeforeEach void setup() {
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        company=insert("INSERT INTO companies(name) VALUES(?)","Canvas "+UUID.randomUUID());other=insert("INSERT INTO companies(name) VALUES(?)","Other "+UUID.randomUUID());
        user=insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic-only','Board test')","canvas-"+UUID.randomUUID()+"@example.com");
        membership=insert("INSERT INTO user_companies(user_id,company_id,role,status) VALUES(?,?,'user','active')",user,company);
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'ideas_board','active','test')",company);
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'ideas_board','user')",membership);
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'ideas_board','canvas')",membership);
        actor=new AuthSessionUser(user,company,"Canvas test","user");
    }
    String key(){return IdeasBoardRepository.key(actor,PERSONAL);}
    MockHttpSession session(){var s=new MockHttpSession();s.setAttribute(SessionAuthService.SESSION_USER_ID,user);s.setAttribute(SessionAuthService.SESSION_COMPANY_ID,company);s.setAttribute(SessionAuthService.SESSION_USER_NAME,"Synthetic");s.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF,"synthetic-csrf");return s;}
    Node node(String text){return new Node(UUID.randomUUID().toString(),"TEXT",text,40d,50d,240d,160d,"NOTE","YELLOW",null);}
    Input input(String text,long version){return new Input(new Document(List.of(node(text)),List.of(),new Viewport(0d,0d,1d)),version,UUID.randomUUID().toString());}
    byte[] png() throws Exception {var image=new java.awt.image.BufferedImage(8,6,java.awt.image.BufferedImage.TYPE_INT_RGB);var out=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",out);return out.toByteArray();}
    Appearance appearance(String font) {return new Appearance(font,32d,"#123456","#aabbcc","#ff6600",4d,true,true,true,false,"STRETCH");}
    Node styled(String font,double width,double height) {return new Node(UUID.randomUUID().toString(),"TEXT","Personalized",40d,140d,width,height,"RECTANGLE","BLUE",null,appearance(font));}
    Input request(Node node,long version,String mutation){return new Input(new Document(List.of(node),List.of(),empty().viewport()),version,mutation);}
    Node stroke(){return new Node(UUID.randomUUID().toString(),"DRAWING","",40d,140d,240d,160d,"PLAIN","BLUE",null,null,new Drawing(List.of(new DrawingPoint(.1d,.1d),new DrawingPoint(.5d,.8d),new DrawingPoint(.9d,.2d)),"#2563eb",4d));}
    @Test void recoveryReadsCreativeDataAndRejectsLegacyWritesWithoutChangingContent() throws Exception {
        var input=request(stroke(),0,UUID.randomUUID().toString());
        service.save(actor,key(),input,PERSONAL);
        var system=new SystemDocument(List.of(new Element(stroke(),"PERSON","IDEA")),List.of(),new SystemViewport(0d,0d,.04d));
        workspace.saveSystem(actor,key(),new SystemInput(system,0,UUID.randomUUID().toString()));
        var project=workspace.saveProject(actor,key(),UUID.randomUUID().toString(),new ProjectInput("Recovery","SYSTEM",null,system));
        mvc.perform(get(URL).session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.content.nodes[0].drawing.points[1].y").value(.8));
        mvc.perform(get(URL+"/system").session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.content.viewport.zoom").value(.04));
        mvc.perform(get(URL+"/projects/"+project.summary().id()).session(session())).andExpect(status().isOk());
        mvc.perform(put(URL).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(request(node("Legacy overwrite"),1,UUID.randomUUID().toString())))).andExpect(status().isServiceUnavailable());
        mvc.perform(put(URL+"/system").session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(new SystemInput(system,1,UUID.randomUUID().toString())))).andExpect(status().isServiceUnavailable());
        mvc.perform(put(URL+"/projects/"+UUID.randomUUID()).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(new ProjectInput("Forbidden","SYSTEM",null,system)))).andExpect(status().isServiceUnavailable());
        mvc.perform(post(URL+"/assets/"+UUID.randomUUID()).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).header("X-Idea-Photo-Name","test.png").contentType("image/png").content(png())).andExpect(status().isServiceUnavailable());
        assertThat(service.get(actor,PERSONAL).content()).isEqualTo(input.content());
        assertThat(workspace.system(actor).content()).isEqualTo(system);
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
    }
}
