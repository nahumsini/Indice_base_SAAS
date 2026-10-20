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
class BoardAppearanceIntegrationTest {
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
    @Test void legacyDocumentsRemainCompatibleAndDoNotGainANullAppearanceField() throws Exception {
        Node legacy=node("Existing");String json=mapper.writeValueAsString(legacy);assertThat(json).doesNotContain("appearance");
        assertThat(mapper.readValue(json,Node.class).appearance()).isNull();
        var old=service.save(actor,key(),request(legacy,0,UUID.randomUUID().toString()),PERSONAL);assertThat(old.content().nodes().getFirst().appearance()).isNull();
    }
    @Test void allSevenFontsColorsAndSmallIndependentDimensionsRoundTripThroughHttp() throws Exception {
        long version=0;
        for(String font:List.of("SYSTEM","SANS","SERIF","MONO","ROUNDED","HANDWRITING","DISPLAY")) {
            var input=request(styled(font,60,45),version++,UUID.randomUUID().toString());
            mvc.perform(put(URL).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(input)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.nodes[0].appearance.fontFamily").value(font)).andExpect(jsonPath("$.content.nodes[0].width").value(60));
        }
        var result=service.get(actor,PERSONAL).content().nodes().getFirst();assertThat(result.appearance().bold()).isTrue();assertThat(result.appearance().underline()).isTrue();assertThat(result.appearance().imageFit()).isEqualTo("STRETCH");
    }
    @Test void personalAndSystemProjectSnapshotsKeepTheExactFormattingAndDimensions() {
        var n=styled("SERIF",320,210);var content=new Document(List.of(n),List.of(),empty().viewport());
        var free=workspace.saveProject(actor,key(),UUID.randomUUID().toString(),new ProjectInput("Formatted board","FREEFORM",content,null));
        assertThat(free.freeform().nodes().getFirst()).isEqualTo(n);
        var graph=new SystemDocument(List.of(new Element(n,"PERSON","PERSON")),List.of(),new SystemViewport(0d,0d,.3d));
        workspace.saveSystem(actor,key(),new SystemInput(graph,0,UUID.randomUUID().toString()));
        var project=workspace.saveProject(actor,key(),UUID.randomUUID().toString(),new ProjectInput("Formatted diagnosis","SYSTEM",null,graph));
        assertThat(project.system().elements().getFirst().node().appearance()).isEqualTo(n.appearance());assertThat(project.system().elements().getFirst().node().height()).isEqualTo(210);
    }
    @Test void unsafeCssValuesInvalidRangesAndPartialStyleObjectsAreRejectedWithoutMutation() throws Exception {
        var valid=mapper.valueToTree(request(styled("SYSTEM",200,120),0,UUID.randomUUID().toString()));
        for(var field:Map.of("fontFamily","url(evil)","textColor","red;display:none","fillColor","url(data:bad)","borderColor","#xyzxyz","imageFit","SCRIPT").entrySet()) {
            var bad=valid.deepCopy();((com.fasterxml.jackson.databind.node.ObjectNode)bad.path("content").path("nodes").get(0).path("appearance")).put(field.getKey(),field.getValue());
            mvc.perform(put(URL).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(bad))).andExpect(status().isBadRequest());
        }
        for(var field:Map.of("fontSize",97,"borderWidth",13).entrySet()) {
            var bad=valid.deepCopy();((com.fasterxml.jackson.databind.node.ObjectNode)bad.path("content").path("nodes").get(0).path("appearance")).put(field.getKey(),field.getValue());
            mvc.perform(put(URL).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(bad))).andExpect(status().isBadRequest());
        }
        var bad=valid.deepCopy();((com.fasterxml.jackson.databind.node.ObjectNode)bad.path("content").path("nodes").get(0)).set("appearance",mapper.createObjectNode());
        mvc.perform(put(URL).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(bad))).andExpect(status().isBadRequest());
        assertThat(service.get(actor,PERSONAL).version()).isZero();
    }
    @Test void uncertainRetriesKeepFormattingAndRejectAChangedStyleUnderTheSameMutation() {
        var n=styled("MONO",200,120);String mutation=UUID.randomUUID().toString();var input=request(n,0,mutation);var saved=service.save(actor,key(),input,PERSONAL);assertThat(service.save(actor,key(),input,PERSONAL)).isEqualTo(saved);
        var changed=new Node(n.id(),n.kind(),n.text(),n.x(),n.y(),n.width(),n.height(),n.shape(),n.color(),null,appearance("SERIF"));
        assertThatThrownBy(()->service.save(actor,key(),request(changed,0,mutation),PERSONAL)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void theSalesOwnerKeepsItsOldGeometryAndRejectsPersonalFormatting() {
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'crm','active','test')",company);
        assertThatThrownBy(()->service.save(actor,IdeasBoardRepository.key(actor),request(styled("SYSTEM",200,120),0,UUID.randomUUID().toString()))).isInstanceOf(ResponseStatusException.class);
        var n=new Node(UUID.randomUUID().toString(),"TEXT","Small",0d,0d,60d,45d,"RECTANGLE","BLUE",null);
        assertThatThrownBy(()->service.save(actor,IdeasBoardRepository.key(actor),request(n,0,UUID.randomUUID().toString()))).isInstanceOf(ResponseStatusException.class);
        assertThat(service.get(actor).version()).isZero();
    }
}
