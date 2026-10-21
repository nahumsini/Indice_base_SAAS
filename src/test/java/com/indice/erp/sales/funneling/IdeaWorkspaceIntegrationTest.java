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
class IdeaWorkspaceIntegrationTest {
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
    SystemDocument graph() {
        var categories=List.of("PERSON","PROCESS","PRODUCT","FINANCE");var icons=List.of("PERSON","CHECKLIST","BOX","BALANCE");var colors=List.of("BLUE","YELLOW","CORAL","MINT");
        var elements=new ArrayList<Element>();
        for(int i=0;i<4;i++) {double x=(i==1||i==2)?1150:50,y=i>=2?950:150;
            var n=new Node(UUID.randomUUID().toString(),"TEXT",categories.get(i),x,y,180d,120d,"RECTANGLE",colors.get(i),null);elements.add(new Element(n,categories.get(i),icons.get(i)));}
        var links=new ArrayList<Connection>();for(int i=0;i<4;i++)links.add(new Connection(UUID.randomUUID().toString(),elements.get(i).node().id(),elements.get((i+1)%4).node().id(),"Flow"));
        return new SystemDocument(elements,links,new SystemViewport(0d,0d,.2d));
    }
    SystemInput systemInput(SystemDocument content,long version) {return new SystemInput(content,version,UUID.randomUUID().toString());}
    ProjectInput projectInput(String name) {return new ProjectInput(name,"SYSTEM",null,graph());}
    @Test void emptySystemIsPrivateAndDoesNotCreateRecords() throws Exception {
        mvc.perform(get(URL+"/system").session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.actorKey").value(key()));
        assertThat(db.queryForObject("SELECT COUNT(*) FROM personal_system_boards WHERE company_id=?",Long.class,company)).isZero();
        assertThat(workspace.system(new AuthSessionUser(user,other,"Other","user")).content().elements()).isEmpty();
    }
    @Test void clockwiseSystemSavesAllFourAreasAndAnyCrossAreaConnections() {
        var content=graph();var links=new ArrayList<>(content.connections());links.add(new Connection(UUID.randomUUID().toString(),content.elements().get(0).node().id(),content.elements().get(2).node().id(),"Cross area"));
        var request=systemInput(new SystemDocument(content.elements(),links,content.viewport()),0);var saved=workspace.saveSystem(actor,key(),request);
        assertThat(saved.content().elements()).hasSize(4);assertThat(saved.content().connections()).hasSize(5);assertThat(saved.content().viewport().zoom()).isEqualTo(.2);
        assertThat(workspace.saveSystem(actor,key(),request)).isEqualTo(saved);assertThat(service.get(actor,PERSONAL).version()).isZero();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM personal_idea_workspace_audit WHERE company_id=?",Long.class,company)).isEqualTo(1);
    }
    @Test void staleMetadataAndActorCannotOverwriteSystemOrOtherCompany() {
        workspace.saveSystem(actor,key(),systemInput(graph(),0));
        assertThatThrownBy(()->workspace.saveSystem(actor,key(),systemInput(graph(),0))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->workspace.saveSystem(actor,"ideas_board:0:0",systemInput(graph(),1))).isInstanceOf(ResponseStatusException.class);
        assertThat(workspace.system(actor).version()).isEqualTo(1);assertThat(workspace.system(new AuthSessionUser(user,other,"Other","user")).version()).isZero();
    }
    @Test void invalidCategoryIconGeometryAndBrokenConnectionsAreRejected() {
        var graph=graph();var e=graph.elements().getFirst();var invalid=new Element(e.node(),e.category(),"UNKNOWN_ICON");
        assertThatThrownBy(()->workspace.saveSystem(actor,key(),systemInput(new SystemDocument(List.of(invalid),List.of(),graph.viewport()),0))).isInstanceOf(ResponseStatusException.class);
        var outside=new Node(e.node().id(),"TEXT","Outside",1200d,1200d,180d,120d,"RECTANGLE","BLUE",null);
        assertThatThrownBy(()->workspace.saveSystem(actor,key(),systemInput(new SystemDocument(List.of(new Element(outside,"PERSON","PERSON")),List.of(),graph.viewport()),0))).isInstanceOf(ResponseStatusException.class);
        var broken=new Connection(UUID.randomUUID().toString(),e.node().id(),UUID.randomUUID().toString(),"");
        assertThatThrownBy(()->workspace.saveSystem(actor,key(),systemInput(new SystemDocument(graph.elements(),List.of(broken),graph.viewport()),0))).isInstanceOf(ResponseStatusException.class);
        assertThat(workspace.system(actor).version()).isZero();
    }
    @Test void namedSnapshotsAreImmutableIdempotentAndIndependentOfCurrentDrafts() {
        String id=UUID.randomUUID().toString();var request=projectInput("  Diagnóstico inicial  ");var saved=workspace.saveProject(actor,key(),id,request);
        assertThat(saved.summary().name()).isEqualTo("Diagnóstico inicial");assertThat(saved.summary().nodeCount()).isEqualTo(4);
        assertThat(workspace.saveProject(actor,key(),id,request)).isEqualTo(saved);
        assertThatThrownBy(()->workspace.saveProject(actor,key(),id,projectInput("Changed"))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->workspace.project(new AuthSessionUser(user,other,"Other","user"),id)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->workspace.project(new AuthSessionUser(user+1000,company,"Other","user"),id)).isInstanceOf(ResponseStatusException.class);
        assertThat(workspace.system(actor).version()).isZero();assertThat(service.get(actor,PERSONAL).version()).isZero();
    }
    @Test void freeformAndSystemSnapshotsAreSearchableAndPaginatedWithoutWildcardExpansion() {
        workspace.saveProject(actor,key(),UUID.randomUUID().toString(),new ProjectInput("Idea 100%_literal","FREEFORM",input("Idea",0).content(),null));
        workspace.saveProject(actor,key(),UUID.randomUUID().toString(),projectInput("Diagnóstico"));
        assertThat(workspace.projects(actor,"%_",1,12).items()).hasSize(1);assertThat(workspace.projects(actor,"",1,1).items()).hasSize(1);
        assertThat(workspace.projects(actor,"",2,1).items()).hasSize(1);assertThat(workspace.projects(actor,"",1,12).total()).isEqualTo(2);
        assertThat(workspace.projects(new AuthSessionUser(user,other,"Other","user"),"",1,12).items()).isEmpty();
    }
    @Test void projectPayloadRequiresExactlyItsSelectedTypeAndValidPrivatePhotoOwnership() {
        assertThatThrownBy(()->workspace.saveProject(actor,key(),UUID.randomUUID().toString(),new ProjectInput("Bad","SYSTEM",input("x",0).content(),graph()))).isInstanceOf(ResponseStatusException.class);
        var n=new Node(UUID.randomUUID().toString(),"IMAGE","Person",40d,140d,180d,120d,"RECTANGLE","BLUE",UUID.randomUUID().toString());
        var graph=new SystemDocument(List.of(new Element(n,"PERSON","PERSON")),List.of(),new SystemViewport(0d,0d,1d));
        assertThatThrownBy(()->workspace.saveProject(actor,key(),UUID.randomUUID().toString(),new ProjectInput("Bad photo","SYSTEM",null,graph))).isInstanceOf(ResponseStatusException.class);
        assertThat(workspace.projects(actor,"",1,12).total()).isZero();
    }
    @Test void systemPhotoNamesAndSnapshotsRetainOnlyTheirOwnersPrivatePhotoReferences() throws Exception {
        when(storage.isEnabled()).thenReturn(true);String asset=UUID.randomUUID().toString();service.upload(actor,key(),asset,"person.png","image/png",png(),PERSONAL);
        var n=new Node(UUID.randomUUID().toString(),"IMAGE","Ana",40d,140d,180d,120d,"RECTANGLE","BLUE",asset);
        var graph=new SystemDocument(List.of(new Element(n,"PERSON","PERSON")),List.of(),new SystemViewport(0d,0d,1d));
        workspace.saveSystem(actor,key(),systemInput(graph,0));var snapshot=workspace.saveProject(actor,key(),UUID.randomUUID().toString(),new ProjectInput("Equipo","SYSTEM",null,graph));
        assertThat(snapshot.system().elements().getFirst().node().assetId()).isEqualTo(asset);assertThat(service.get(actor,PERSONAL).content().nodes()).isEmpty();
    }
    @Test void newRoutesRequireSessionCsrfModuleAndCurrentTabPermission() throws Exception {
        mvc.perform(get(URL+"/system")).andExpect(status().isUnauthorized());mvc.perform(get(URL+"/projects")).andExpect(status().isUnauthorized());
        mvc.perform(put(URL+"/system").session(session()).header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(systemInput(graph(),0)))).andExpect(status().isForbidden());
        mvc.perform(put(URL+"/projects/"+UUID.randomUUID()).session(session()).header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(projectInput("No CSRF")))).andExpect(status().isForbidden());
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=?",membership);
        mvc.perform(get(URL+"/projects").session(session())).andExpect(status().isForbidden());mvc.perform(get(URL+"/system").session(session())).andExpect(status().isForbidden());
    }
    @Test void validSystemAndNamedProjectRoundTripThroughNativeHttpRoutes() throws Exception {
        var content=graph();
        mvc.perform(put(URL+"/system").session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(systemInput(content,0))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1)).andExpect(jsonPath("$.content.elements.length()").value(4));
        String id=UUID.randomUUID().toString();var input=new ProjectInput("Diagnóstico HTTP","SYSTEM",null,content);
        mvc.perform(put(URL+"/projects/"+id).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(input)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.summary.id").value(id)).andExpect(jsonPath("$.summary.kind").value("SYSTEM"));
        mvc.perform(get(URL+"/projects").session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.items[0].nodeCount").value(4));
        mvc.perform(get(URL+"/projects/"+id).session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.system.connections.length()").value(4));
        assertThat(workspace.system(actor).version()).isEqualTo(1);
    }
    @Test void sharedToolsRoundTripShapesMultilineColorsAndCrossAreaMovement() {
        var elements=new ArrayList<Element>();var shapes=List.of("NOTE","PLAIN","ELLIPSE","RECTANGLE");
        for(int i=0;i<4;i++)elements.add(new Element(new Node(UUID.randomUUID().toString(),"TEXT","Idea\n"+"Texto práctico ".repeat(20),50d+i*200,150d,180d,120d,shapes.get(i),"LAVENDER",null),"PERSON","IDEA"));
        var graph=new SystemDocument(elements,List.of(),new SystemViewport(0d,0d,.08d));
        var saved=workspace.saveSystem(actor,key(),systemInput(graph,0));assertThat(saved.content()).isEqualTo(graph);
        var first=elements.getFirst().node();elements.set(0,new Element(new Node(first.id(),first.kind(),first.text(),1250d,150d,first.width(),first.height(),first.shape(),first.color(),null),"PROCESS","IDEA"));
        var moved=new SystemDocument(elements,List.of(),graph.viewport());workspace.saveSystem(actor,key(),systemInput(moved,1));
        var project=workspace.saveProject(actor,key(),UUID.randomUUID().toString(),new ProjectInput("Herramientas compartidas","SYSTEM",null,moved));assertThat(project.system()).isEqualTo(moved);
    }
    @Test void photosWorkInEveryAreaAndKeepPersonalOwnership() throws Exception {
        when(storage.isEnabled()).thenReturn(true);String asset=UUID.randomUUID().toString();service.upload(actor,key(),asset,"reference.png","image/png",png(),PERSONAL);
        var original=graph();var elements=new ArrayList<Element>();
        for(var element:original.elements()){var n=element.node();elements.add(new Element(new Node(n.id(),"IMAGE","",n.x(),n.y(),n.width(),n.height(),"ELLIPSE","CORAL",asset),element.category(),"IDEA"));}
        var graph=new SystemDocument(elements,List.of(),original.viewport());assertThat(workspace.saveSystem(actor,key(),systemInput(graph,0)).content()).isEqualTo(graph);
        var foreign=new AuthSessionUser(user,other,"Other","user");assertThatThrownBy(()->service.asset(foreign,asset,PERSONAL)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void sharedTotalLimitAllowsOneHundredIdeasAndRejectsOutsideWorld() {
        var elements=new ArrayList<Element>();for(int i=0;i<100;i++)elements.add(new Element(new Node(UUID.randomUUID().toString(),"TEXT","Idea "+i,50d,150d,180d,120d,"NOTE","YELLOW",null),"PERSON","IDEA"));
        var graph=new SystemDocument(elements,List.of(),new SystemViewport(0d,0d,1d));assertThat(workspace.saveSystem(actor,key(),systemInput(graph,0)).content().elements()).hasSize(100);
        elements.add(new Element(node("Extra"),"PERSON","IDEA"));assertThatThrownBy(()->workspace.saveSystem(actor,key(),systemInput(new SystemDocument(elements,List.of(),graph.viewport()),1))).isInstanceOf(ResponseStatusException.class);
        var outside=new Node(UUID.randomUUID().toString(),"TEXT","Outside",2190d,150d,180d,120d,"NOTE","BLUE",null);
        assertThatThrownBy(()->workspace.saveSystem(actor,key(),systemInput(new SystemDocument(List.of(new Element(outside,"PROCESS","IDEA")),List.of(),graph.viewport()),1))).isInstanceOf(ResponseStatusException.class);
        assertThat(workspace.system(actor).version()).isEqualTo(1);
    }

    @Test void diagnosticStepsIndustryAndReportsRoundTripInPrivateSnapshots() throws Exception {
        var process=graph().elements().get(1);var product=graph().elements().get(2);var finance=graph().elements().get(3);
        var detailed=new Element(process.node(),"PROCESS","QUALITY",List.of("Revisar pedido","Preparar paquete","Confirmar entrega"),null);
        var serviceElement=new Element(product.node(),"PRODUCT","CLEANING",null,"SERVICE");
        var content=new SystemDocument(List.of(detailed,serviceElement,new Element(finance.node(),"FINANCE","EQUITY_CHANGES")),List.of(),graph().viewport());
        var input=systemInput(content,0);assertThat(workspace.saveSystem(actor,key(),input).content()).isEqualTo(content);
        assertThat(workspace.saveSystem(actor,key(),input).version()).isEqualTo(1);
        String id=UUID.randomUUID().toString();workspace.saveProject(actor,key(),id,new ProjectInput("Pasos y giro","SYSTEM",null,content));
        mvc.perform(get(URL+"/projects/"+id).session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.system.elements[0].steps[2]").value("Confirmar entrega")).andExpect(jsonPath("$.system.elements[1].offeringType").value("SERVICE"));
        assertThatThrownBy(()->workspace.project(new AuthSessionUser(user+1000,company,"Other","user"),id)).isInstanceOf(ResponseStatusException.class);
        var n=process.node();var moved=new Node(n.id(),n.kind(),n.text(),50d,150d,n.width(),n.height(),n.shape(),n.color(),n.assetId());
        var next=new SystemDocument(List.of(new Element(moved,"PERSON","QUALITY",detailed.steps(),null)),List.of(),content.viewport());
        assertThat(workspace.saveSystem(actor,key(),systemInput(next,1)).content().elements().getFirst().steps()).isEqualTo(detailed.steps());
        assertThat(workspace.project(actor,id).system()).isEqualTo(content);
    }
    @Test void invalidStepsAndOfferingTypeAreRejectedBeforeChangingSavedWork() {
        var process=graph().elements().get(1);
        for(var steps:List.of(List.of(""),List.of("  "),List.of("x".repeat(501)),Collections.nCopies(51,"Paso"))) {
            var content=new SystemDocument(List.of(new Element(process.node(),"PROCESS","CHECKLIST",steps,null)),List.of(),graph().viewport());
            assertThatThrownBy(()->workspace.saveSystem(actor,key(),systemInput(content,0))).isInstanceOf(ResponseStatusException.class);
            assertThatThrownBy(()->workspace.saveProject(actor,key(),UUID.randomUUID().toString(),new ProjectInput("Inválido","SYSTEM",null,content))).isInstanceOf(ResponseStatusException.class);
        }
        var invalid=new SystemDocument(List.of(new Element(process.node(),"PROCESS","CHECKLIST",null,"UNKNOWN")),List.of(),graph().viewport());
        assertThatThrownBy(()->workspace.saveSystem(actor,key(),systemInput(invalid,0))).isInstanceOf(ResponseStatusException.class);
        assertThat(workspace.system(actor).version()).isZero();
    }
    @Test void optionalMetadataDoesNotChangeLegacyJsonOrIdempotentRetries() throws Exception {
        var json=mapper.writeValueAsString(graph());assertThat(json).doesNotContain("steps","offeringType");
        var request=systemInput(mapper.readValue(json,SystemDocument.class),0);workspace.saveSystem(actor,key(),request);
        assertThat(workspace.saveSystem(actor,key(),request).version()).isEqualTo(1);
    }

    @Test void allDiagnosticCatalogueIconsAreAcceptedAndPersisted() {
        var base=graph().elements().getFirst();long version=0;
        for(String icon:List.of("CHECKLIST","GEAR","FLOW","DELIVERY","PRODUCTION","PURCHASING","STOCK_CONTROL","QUALITY","SERVICE_DELIVERY","SALES_PROCESS","PROSPECTING","MARKETING","CUSTOMER_CARE","AFTER_SALES","BILLING","COLLECTIONS_PROCESS","PAYMENTS_PROCESS","HIRING","ONBOARDING","PAYROLL_PROCESS","MAINTENANCE_PROCESS","ADMINISTRATION","BOX","SERVICE","COFFEE","FOOD","TOOLS","PHONE","GROCERY","BAKERY","FASHION","FOOTWEAR","BEAUTY","HEALTH","PHARMACY","EDUCATION","PROFESSIONAL","SOFTWARE","CONSTRUCTION","REAL_ESTATE","AUTOMOTIVE","TRANSPORT","TOURISM","EVENTS","FITNESS","HOME_GOODS","AGRICULTURE","PETS","CLEANING","MANUFACTURING","CRM","POS","SALES_FUNNEL","STORE","MARKETPLACE","DISTRIBUTORS","PARTNERS","REFERRALS","ONLINE","SOCIAL","CHAT","EMAIL","WHATSAPP","PHONE_SALES","SEO","GOOGLE_ADS","AI_ADS","META_ADS","TIKTOK_ADS","YOUTUBE","ACTIVATIONS","TRADE_SHOW","INFLUENCERS","BALANCE","INCOME","CASH_FLOW","EQUITY_CHANGES","TRIAL_BALANCE","LEDGER_DETAIL","FINANCIAL_CLOSE","FINANCIAL_PULSE","PROFIT_BRIDGE","CASH_BRIDGE","FINANCIAL_TREND","UNIT_RESULTS","BUDGET","COSTS","EXPENSE_REPORT","EXPENSE_AGING","TAX_REPORT","RECEIVABLE_REPORT","RECEIVABLE_AGING","UPCOMING_COLLECTIONS","PETTY_CASH_STATEMENT","FUND_BALANCES","CASH_RECONCILIATION","SALES_REPORT","POS_CLOSING","PAYROLL_REPORT","SALES_COMMISSION")) {
            var content=new SystemDocument(List.of(new Element(base.node(),"PERSON",icon)),List.of(),graph().viewport());
            assertThat(workspace.saveSystem(actor,key(),systemInput(content,version++)).content().elements().getFirst().icon()).isEqualTo(icon);
        }
    }

    @Test void doubleArrowsPersistInSystemAndBothImmutableProjectKinds() {
        var original=graph();var elements=original.elements();var first=original.connections().getFirst();
        var doubleArrow=new Connection(first.id(),first.from(),first.to(),"Relación doble","BOTH");
        var system=new SystemDocument(elements,List.of(doubleArrow),original.viewport());
        assertThat(workspace.saveSystem(actor,key(),systemInput(system,0)).content().connections().getFirst().direction()).isEqualTo("BOTH");
        String systemId=UUID.randomUUID().toString();workspace.saveProject(actor,key(),systemId,new ProjectInput("Sistema doble","SYSTEM",null,system));
        var freeform=new Document(elements.stream().map(Element::node).toList(),system.connections(),new Viewport(0d,0d,1d));
        String freeId=UUID.randomUUID().toString();workspace.saveProject(actor,key(),freeId,new ProjectInput("Pizarra doble","FREEFORM",freeform,null));
        assertThat(workspace.project(actor,systemId).system().connections().getFirst().direction()).isEqualTo("BOTH");
        assertThat(workspace.project(actor,freeId).freeform().connections().getFirst().direction()).isEqualTo("BOTH");
        assertThatThrownBy(()->workspace.project(new AuthSessionUser(user,other,"Other","user"),systemId)).isInstanceOf(ResponseStatusException.class);
    }

    @Test void outsideAnnotationsAndConnectionsRoundTripInThePrivateProject() throws Exception {
        var original=graph();var first=original.elements().getFirst();
        var note=new Node(UUID.randomUUID().toString(),"TEXT","Revisar después de la reunión",-500d,-300d,220d,220d,"NOTE","YELLOW",null);
        var outside=new Element(note,"OUTSIDE","IDEA");
        var content=new SystemDocument(List.of(first,outside),List.of(new Connection(UUID.randomUUID().toString(),first.node().id(),note.id(),"Pendiente","BOTH")),new SystemViewport(0d,0d,.04d));
        var request=systemInput(content,0);assertThat(workspace.saveSystem(actor,key(),request).content()).isEqualTo(content);
        assertThat(workspace.saveSystem(actor,key(),request).version()).isEqualTo(1);
        String id=UUID.randomUUID().toString();workspace.saveProject(actor,key(),id,new ProjectInput("Anotaciones externas","SYSTEM",null,content));
        mvc.perform(get(URL+"/projects/"+id).session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.system.elements[1].category").value("OUTSIDE")).andExpect(jsonPath("$.system.elements[1].node.x").value(-500));
        assertThatThrownBy(()->workspace.project(new AuthSessionUser(user,other,"Other","user"),id)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void aThreeElementCaptureSavesAsOneVersionAndAnInvalidItemCannotPartiallyWrite() {
        var elements=new ArrayList<Element>();for(int i=0;i<3;i++)elements.add(new Element(new Node(UUID.randomUUID().toString(),"TEXT","Persona "+i,50d+i*210d,150d,180d,120d,"RECTANGLE","BLUE",null),"PERSON","PERSON"));
        var content=new SystemDocument(elements,List.of(),graph().viewport());
        assertThat(workspace.saveSystem(actor,key(),systemInput(content,0)).version()).isEqualTo(1);
        assertThat(workspace.system(actor).content().elements()).hasSize(3);
        var n=elements.get(1).node();var invalid=new ArrayList<>(elements);invalid.set(1,new Element(new Node(n.id(),n.kind(),"",n.x(),n.y(),n.width(),n.height(),n.shape(),n.color(),null),"PERSON","PERSON"));
        assertThatThrownBy(()->workspace.saveSystem(actor,key(),systemInput(new SystemDocument(invalid,List.of(),content.viewport()),1))).isInstanceOf(ResponseStatusException.class);
        assertThat(workspace.system(actor).version()).isEqualTo(1);assertThat(workspace.system(actor).content()).isEqualTo(content);
    }
    @Test void outsideCategoryRejectsForgedGeometryNamedItemsAndOutOfBoundsAnnotations() {
        for(var e:List.of(
            new Element(new Node(UUID.randomUUID().toString(),"TEXT","Dentro",50d,150d,220d,220d,"NOTE","YELLOW",null),"OUTSIDE","IDEA"),
            new Element(new Node(UUID.randomUUID().toString(),"TEXT","Lejos",-1300d,150d,220d,220d,"NOTE","YELLOW",null),"OUTSIDE","IDEA"),
            new Element(new Node(UUID.randomUUID().toString(),"TEXT","Persona",-400d,150d,180d,120d,"RECTANGLE","BLUE",null),"OUTSIDE","PERSON"),
            new Element(new Node(UUID.randomUUID().toString(),"TEXT","Área incorrecta",-400d,150d,220d,220d,"NOTE","YELLOW",null),"PERSON","IDEA"))) {
            var content=new SystemDocument(List.of(e),List.of(),graph().viewport());
            assertThatThrownBy(()->workspace.saveSystem(actor,key(),systemInput(content,0))).isInstanceOf(ResponseStatusException.class);
            assertThatThrownBy(()->workspace.saveProject(actor,key(),UUID.randomUUID().toString(),new ProjectInput("Inválido","SYSTEM",null,content))).isInstanceOf(ResponseStatusException.class);
        }
        assertThat(workspace.system(actor).version()).isZero();
    }

}
