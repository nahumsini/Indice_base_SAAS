package com.indice.erp.sales.funneling;
import com.indice.erp.auth.*;
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
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"app.email.enabled=false","app.mail-accounts.worker-enabled=false","app.mailing.worker-enabled=false"})
@AutoConfigureMockMvc
@Transactional
class IdeasBoardIntegrationTest {
    @Autowired JdbcTemplate db;
    @Autowired IdeasBoardService service;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired ObjectStorageProperties properties;
    @MockitoBean ObjectStorageService storage;
    @MockitoBean CompanyStorageMeter meter;
    long company, other, user, membership;
    AuthSessionUser actor;

    long insert(String sql, Object... args) {
        var key = new GeneratedKeyHolder();
        db.update(connection -> {
            var statement = connection.prepareStatement(sql, java.sql.Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < args.length; i++) statement.setObject(i + 1, args[i]);
            return statement;
        }, key);
        return key.getKey().longValue();
    }
    @BeforeEach void setup() {
        assertThat(db.queryForObject("SELECT DATABASE()", String.class)).isEqualTo("indice_test_db");
        company = insert("INSERT INTO companies(name) VALUES(?)", "Funnel " + UUID.randomUUID());
        other = insert("INSERT INTO companies(name) VALUES(?)", "Other " + UUID.randomUUID());
        user = insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic-only','Funnel test')", "funnel-" + UUID.randomUUID() + "@example.com");
        membership = insert("INSERT INTO user_companies(user_id,company_id,role,status) VALUES(?,?,'user','active')", user, company);
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'crm','active','test')", company);
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'crm','user')", membership);
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'crm','funneling')", membership);
        actor = new AuthSessionUser(user, company, "Funnel test", "user");
    }
    MockHttpSession session() {
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, user);
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, company);
        session.setAttribute(SessionAuthService.SESSION_USER_NAME, "Synthetic");
        session.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF, "synthetic-csrf");
        return session;
    }

    String key(){ return IdeasBoardRepository.key(actor); }
    Node node(String id){ return new Node(id,"TEXT","Idea",40d,50d,240d,160d,"NOTE","YELLOW",null); }
    Document doc(Node... nodes){ return new Document(List.of(nodes),List.of(),new Viewport(25d,-40d,.75d)); }
    Input input(Document content,long version){return new Input(content,version,UUID.randomUUID().toString());}
    byte[] png() throws Exception { var image=new java.awt.image.BufferedImage(8,6,java.awt.image.BufferedImage.TYPE_INT_RGB);var bytes=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",bytes);return bytes.toByteArray(); }
    String photo(byte[] bytes) { when(storage.isEnabled()).thenReturn(true);String id=UUID.randomUUID().toString();service.upload(actor,key(),id,"sample.png","image/png",bytes);return id; }
    @Test void emptyReadIsPrivateAndDoesNotCreateRecords() {
        assertThat(service.get(actor).content().nodes()).isEmpty();
        assertThat(service.get(actor).actorKey()).isEqualTo(key());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_funnel_idea_boards WHERE company_id=?",Long.class,company)).isZero();
    }
    @Test void savesNodesArrowsViewportAndMetadataOnlyAudit() {
        var a=node(UUID.randomUUID().toString());var b=node(UUID.randomUUID().toString());var content=new Document(List.of(a,b),List.of(new Connection(UUID.randomUUID().toString(),a.id(),b.id(),"Next")),new Viewport(20d,-100d,1.25d));
        var saved=service.save(actor,key(),input(content,0));assertThat(saved.version()).isEqualTo(1);assertThat(service.get(actor).content()).isEqualTo(content);
        assertThat(db.queryForObject("SELECT node_count FROM sales_funnel_idea_board_audit WHERE company_id=?",Integer.class,company)).isEqualTo(2);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_funnels WHERE company_id=?",Long.class,company)).isZero();
    }
    @Test void lostResponseRetryIsIdempotentAndStaleSaveNeverOverwrites() {
        var request=input(doc(node(UUID.randomUUID().toString())),0);var first=service.save(actor,key(),request);
        assertThat(service.save(actor,key(),request)).isEqualTo(first);
        assertThatThrownBy(()->service.save(actor,key(),input(empty(),0))).isInstanceOf(ResponseStatusException.class);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_funnel_idea_board_audit WHERE company_id=?",Long.class,company)).isEqualTo(1);
    }
    @Test void actorMismatchAndPrivateUserCompanyScopePreventCrossContextWrites() {
        service.save(actor,key(),input(doc(node(UUID.randomUUID().toString())),0));
        assertThat(service.get(new AuthSessionUser(user,other,"Other","user")).content().nodes()).isEmpty();
        assertThat(service.get(new AuthSessionUser(user+10000,company,"Other","user")).content().nodes()).isEmpty();
        assertThatThrownBy(()->service.save(actor,other+":"+user,input(empty(),1))).isInstanceOf(ResponseStatusException.class);
        assertThat(service.get(actor).version()).isEqualTo(1);
    }
    @Test void rejectsInvalidCoordinatesShapesDuplicateNodesAndDanglingArrows() {
        var a=node(UUID.randomUUID().toString());
        for(var content:List.of(doc(a,a),doc(new Node(a.id(),"TEXT","",Double.NaN,0d,200d,150d,"NOTE","YELLOW",null)),doc(new Node(a.id(),"TEXT","",10001d,0d,200d,150d,"NOTE","YELLOW",null)),doc(new Node(a.id(),"TEXT","",0d,0d,200d,150d,"TRIANGLE","YELLOW",null)),new Document(List.of(a),List.of(new Connection(UUID.randomUUID().toString(),a.id(),UUID.randomUUID().toString(),"")),empty().viewport()))) assertThatThrownBy(()->service.save(actor,key(),input(content,0))).isInstanceOf(ResponseStatusException.class);
        assertThat(service.get(actor).version()).isZero();
    }
    @Test void deniesAnonymousMissingCsrfMissingTabAndModule() throws Exception {
        String body=mapper.writeValueAsString(input(empty(),0)),url="/api/v1/sales/funnels/ideas-board";
        mvc.perform(get(url)).andExpect(status().isUnauthorized());
        mvc.perform(put(url).session(session()).header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=?",membership);
        mvc.perform(get(url).session(session())).andExpect(status().isForbidden());
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'crm','funneling')",membership);
        db.update("DELETE FROM user_company_module_roles WHERE user_company_id=?",membership);
        mvc.perform(get(url).session(session())).andExpect(status().isForbidden());
    }
    @Test void controllerPersistsAndReadsTypedBoard() throws Exception {
        String url="/api/v1/sales/funnels/ideas-board";
        mvc.perform(put(url).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(input(doc(node(UUID.randomUUID().toString())),0)))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(get(url).session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.content.nodes[0].text").value("Idea"));
    }
    @Test void photoIsPrivateBoundedIdempotentMeteredAndRetainedWhenRemoved() throws Exception {
        byte[] bytes=png();String id=photo(bytes);var saved=service.upload(actor,key(),id,"sample.png","image/png",bytes);assertThat(saved.id()).isEqualTo(id);
        verify(meter,times(1)).reserve(eq(company),eq("SALES"),anyString(),contains("/"+company+"/"+user+"/"),eq((long)bytes.length));
        var asset=service.asset(actor,id);when(storage.readObject(anyString(),eq(asset.objectKey()),eq(IdeasBoardService.MAX_BYTES))).thenReturn(bytes);
        mvc.perform(get("/api/v1/sales/funnels/ideas-board/assets/"+id).session(session())).andExpect(status().isOk()).andExpect(header().string("Cache-Control",org.hamcrest.Matchers.containsString("no-store"))).andExpect(header().string("X-Content-Type-Options","nosniff")).andExpect(content().bytes(bytes));
        assertThatThrownBy(()->service.asset(new AuthSessionUser(user,other,"Other","user"),id)).isInstanceOf(ResponseStatusException.class);
        var image=new Node(UUID.randomUUID().toString(),"IMAGE","",0d,0d,240d,160d,"RECTANGLE","WHITE",id);service.save(actor,key(),input(doc(image),0));service.save(actor,key(),input(empty(),1));assertThat(service.asset(actor,id)).isEqualTo(asset);
    }
    @Test void photoUploadEndpointAcceptsBoundedBinaryAndRejectsOversizeAndWrongMime() throws Exception {
        when(storage.isEnabled()).thenReturn(true);String url="/api/v1/sales/funnels/ideas-board/assets/"+UUID.randomUUID();
        mvc.perform(post(url).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).header("X-Idea-Photo-Name","sample.png").contentType("image/png").content(png())).andExpect(status().isOk()).andExpect(jsonPath("$.contentType").value("image/png"));
        mvc.perform(post(url).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).header("X-Idea-Photo-Name","sample.png").contentType("image/png").content(new byte[IdeasBoardService.MAX_BYTES+1])).andExpect(status().isPayloadTooLarge());
        assertThatThrownBy(()->service.upload(actor,key(),UUID.randomUUID().toString(),"a.svg","image/svg+xml",png())).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.upload(actor,key(),UUID.randomUUID().toString(),"a.png","image/png","<script>".getBytes())).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.upload(actor,key(),UUID.randomUUID().toString(),"../a.png","image/png",png())).isInstanceOf(ResponseStatusException.class);
    }
    @Test void unavailableOrFailingStorageDoesNotRegisterAnAssetOrCommitQuota() throws Exception {
        String id=UUID.randomUUID().toString();
        assertThatThrownBy(()->service.upload(actor,key(),id,"sample.png","image/png",png())).isInstanceOf(ResponseStatusException.class);
        when(storage.isEnabled()).thenReturn(true);
        doThrow(new IllegalStateException("Synthetic storage failure")).when(storage).writeObject(anyString(),anyString(),anyString(),any(byte[].class));
        assertThatThrownBy(()->service.upload(actor,key(),id,"sample.png","image/png",png())).isInstanceOf(IllegalStateException.class);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_funnel_idea_assets WHERE company_id=?",Long.class,company)).isZero();
        verify(meter,never()).commit(anyLong(),anyString(),anyString(),anyLong());
    }
    @Test void documentBoundsAndSelfConnectionsAreRejected() {
        var a=node(UUID.randomUUID().toString());
        var oversized=new Document(java.util.stream.IntStream.range(0,101).mapToObj(i->node(UUID.randomUUID().toString())).toList(),List.of(),empty().viewport());
        var self=new Document(List.of(a),List.of(new Connection(UUID.randomUUID().toString(),a.id(),a.id(),"")),empty().viewport());
        var zoom=new Document(List.of(),List.of(),new Viewport(0d,0d,3d));
        for(var content:List.of(oversized,self,zoom))assertThatThrownBy(()->service.save(actor,key(),input(content,0))).isInstanceOf(ResponseStatusException.class);
    }
    @Test void unknownOrForeignPhotoCannotBeAddedToDocument() {
        var n=new Node(UUID.randomUUID().toString(),"IMAGE","",0d,0d,240d,160d,"RECTANGLE","WHITE",UUID.randomUUID().toString());assertThatThrownBy(()->service.save(actor,key(),input(doc(n),0))).isInstanceOf(ResponseStatusException.class);
    }
}
