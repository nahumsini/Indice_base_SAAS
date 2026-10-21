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
import static com.indice.erp.sales.funneling.IdeasBoardScope.PERSONAL;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.email.enabled=false","app.mail-accounts.worker-enabled=false","app.mailing.worker-enabled=false"})
@AutoConfigureMockMvc
@Transactional
class PersonalIdeasBoardIntegrationTest {
    static final String URL="/api/v1/ideas-board";
    @Autowired JdbcTemplate db;
    @Autowired IdeasBoardService service;
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
    @Test void moduleIsComplementaryPilotWithoutAutomaticEntitlementsOrPrices() {
        assertThat(db.queryForMap("SELECT module_category,lifecycle_status,route_key FROM modules WHERE slug='ideas_board'"))
            .containsEntry("module_category","complementary").containsEntry("lifecycle_status","pilot").containsEntry("route_key","ideas-board");
        assertThat(db.queryForObject("SELECT COUNT(*) FROM company_module_entitlements WHERE company_id=? AND module_slug='ideas_board'",Long.class,other)).isZero();
        assertThat(com.indice.erp.configcenter.users.ConfigCenterTabPermissionCatalog.isValidPermissionKey("ideas_board.canvas")).isTrue();
    }
    @Test void personalReadAndWriteWorkWithoutSalesAccess() throws Exception {
        mvc.perform(get(URL).session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.actorKey").value(key()));
        mvc.perform(put(URL).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(input("Independent idea",0))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(get("/api/v1/sales/funnels/ideas-board").session(session())).andExpect(status().isForbidden());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_funnel_idea_boards WHERE company_id=?",Long.class,company)).isZero();
    }
    @Test void salesAndPersonalHaveIndependentContentVersionsAndActorKeys() {
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'crm','active','test')",company);
        service.save(actor,IdeasBoardRepository.key(actor),input("Sales idea",0));
        service.save(actor,key(),input("Personal idea",0),PERSONAL);
        assertThat(service.get(actor).content().nodes().getFirst().text()).isEqualTo("Sales idea");
        assertThat(service.get(actor,PERSONAL).content().nodes().getFirst().text()).isEqualTo("Personal idea");
        assertThat(service.get(actor).version()).isEqualTo(1);assertThat(service.get(actor,PERSONAL).version()).isEqualTo(1);
        assertThatThrownBy(()->service.save(actor,IdeasBoardRepository.key(actor),input("Wrong namespace",1),PERSONAL)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void privateCompanyUserScopeRetryAndStaleProtectionRemainIntact() {
        var request=input("Private",0);var saved=service.save(actor,key(),request,PERSONAL);assertThat(service.save(actor,key(),request,PERSONAL)).isEqualTo(saved);
        assertThat(service.get(new AuthSessionUser(user,other,"Other","user"),PERSONAL).content().nodes()).isEmpty();
        assertThat(service.get(new AuthSessionUser(user+10000,company,"Other","user"),PERSONAL).content().nodes()).isEmpty();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM personal_idea_board_audit WHERE company_id=?",Long.class,company)).isEqualTo(1);
        assertThatThrownBy(()->service.save(actor,key(),input("Stale",0),PERSONAL)).isInstanceOf(ResponseStatusException.class);
        assertThat(service.get(actor,PERSONAL).content().nodes().getFirst().text()).isEqualTo("Private");
    }
    @Test void protectedRoutesRejectAnonymousCsrfTabModuleAndRevokedEntitlement() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mvc.perform(put(URL).session(session()).header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(input("No CSRF",0)))).andExpect(status().isForbidden());
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=?",membership);mvc.perform(get(URL).session(session())).andExpect(status().isForbidden());
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'ideas_board','canvas')",membership);
        db.update("DELETE FROM user_company_module_roles WHERE user_company_id=?",membership);mvc.perform(get(URL).session(session())).andExpect(status().isForbidden());
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'ideas_board','user')",membership);
        db.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=? AND module_slug='ideas_board'",company);mvc.perform(get(URL).session(session())).andExpect(status().isForbidden());
    }
    @Test void standalonePhotosUseTheirOwnPrivateBucketAndQuotaOwner() throws Exception {
        when(storage.isEnabled()).thenReturn(true);String id=UUID.randomUUID().toString();byte[] bytes=png();
        mvc.perform(post(URL+"/assets/"+id).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).header("X-Idea-Photo-Name","sample.png").contentType("image/png").content(bytes)).andExpect(status().isOk());
        var asset=service.asset(actor,id,PERSONAL);assertThat(asset.objectKey()).startsWith("ideas-board/"+company+"/"+user+"/");
        verify(meter).reserve(eq(company),eq("IDEAS_BOARD"),eq(properties.getMinio().getBucketIdeasBoard()),eq(asset.objectKey()),eq((long)bytes.length));
        when(storage.readObject(properties.getMinio().getBucketIdeasBoard(),asset.objectKey(),IdeasBoardService.MAX_BYTES)).thenReturn(bytes);
        mvc.perform(get(URL+"/assets/"+id).session(session())).andExpect(status().isOk()).andExpect(header().string("Cache-Control",org.hamcrest.Matchers.containsString("no-store"))).andExpect(content().bytes(bytes));
        assertThatThrownBy(()->service.asset(actor,id)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->service.asset(new AuthSessionUser(user,other,"Other","user"),id,PERSONAL)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void photoReferencesCannotCrossNamespaces() throws Exception {
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'crm','active','test')",company);when(storage.isEnabled()).thenReturn(true);
        String id=UUID.randomUUID().toString();service.upload(actor,IdeasBoardRepository.key(actor),id,"sales.png","image/png",png());
        var image=new Node(UUID.randomUUID().toString(),"IMAGE","",0d,0d,240d,160d,"RECTANGLE","WHITE",id);
        assertThatThrownBy(()->service.save(actor,key(),new Input(new Document(List.of(image),List.of(),empty().viewport()),0,UUID.randomUUID().toString()),PERSONAL)).isInstanceOf(ResponseStatusException.class);
        assertThat(service.get(actor,PERSONAL).version()).isZero();
    }
    @Test void currentDocumentValidationAndEmptyReadRemainBounded() throws Exception {
        mvc.perform(get(URL).session(session())).andExpect(status().isOk());assertThat(db.queryForObject("SELECT COUNT(*) FROM personal_idea_boards WHERE company_id=?",Long.class,company)).isZero();
        var nodes=java.util.stream.IntStream.range(0,101).mapToObj(i->node("Too many")).toList();
        mvc.perform(put(URL).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(new Input(new Document(nodes,List.of(),empty().viewport()),0,UUID.randomUUID().toString())))).andExpect(status().isBadRequest());
    }
    @Test void personalDoubleArrowsRoundTripAndRetryWithoutChangingLegacyConnections() throws Exception {
        var a=node("Inicio");var b=node("Siguiente");var c=node("Final");
        var first=new Connection(UUID.randomUUID().toString(),a.id(),b.id(),"Entrega","BOTH");
        var second=new Connection(UUID.randomUUID().toString(),b.id(),c.id(),"Continúa");
        var content=new Document(List.of(a,b,c),List.of(first,second),new Viewport(0d,0d,1d));
        var request=new Input(content,0,UUID.randomUUID().toString());
        mvc.perform(put(URL).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(request)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.content.connections[0].direction").value("BOTH")).andExpect(jsonPath("$.content.connections[1].direction").doesNotExist());
        assertThat(service.get(actor,PERSONAL).content()).isEqualTo(content);
        assertThat(service.save(actor,key(),request,PERSONAL).version()).isEqualTo(1);
        assertThat(service.get(new AuthSessionUser(user+10000,company,"Other","user"),PERSONAL).content().connections()).isEmpty();
    }
    @Test void invalidDirectionsAndSalesOptInAreRejected() {
        var a=node("A");var b=node("B");
        var invalid=new Document(List.of(a,b),List.of(new Connection(UUID.randomUUID().toString(),a.id(),b.id(),"","INVALID")),new Viewport(0d,0d,1d));
        assertThatThrownBy(()->service.save(actor,key(),new Input(invalid,0,UUID.randomUUID().toString()),PERSONAL)).isInstanceOf(ResponseStatusException.class);
        var doubleArrow=new Document(List.of(a,b),List.of(new Connection(UUID.randomUUID().toString(),a.id(),b.id(),"","BOTH")),new Viewport(0d,0d,1d));
        assertThatThrownBy(()->service.validateSnapshot(actor,doubleArrow,IdeasBoardScope.FUNNEL)).isInstanceOf(ResponseStatusException.class);
        assertThat(service.get(actor,PERSONAL).version()).isZero();
    }
    @Test void absentDirectionPreservesOldJsonAndIdempotentRequests() throws Exception {
        var a=node("A");var b=node("B");var original=new Document(List.of(a,b),List.of(new Connection(UUID.randomUUID().toString(),a.id(),b.id(),"Entrega")),new Viewport(0d,0d,1d));
        String json=mapper.writeValueAsString(original);assertThat(json).doesNotContain("direction");
        var request=new Input(mapper.readValue(json,Document.class),0,UUID.randomUUID().toString());
        service.save(actor,key(),request,PERSONAL);assertThat(service.save(actor,key(),request,PERSONAL).version()).isEqualTo(1);
    }

}
