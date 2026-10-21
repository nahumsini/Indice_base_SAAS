package com.indice.erp.ideasboard;

import static com.indice.erp.ideasboard.IdeaWorkspaceContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.sales.funneling.*;
import jakarta.validation.Validator;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class IdeaWorkspaceService {
    private final IdeaWorkspaceRepository repository;private final IdeasBoardRepository boards;
    private final IdeasBoardService canvas;private final ModuleAccessService modules;private final Validator validator;
    private static final Map<String,Set<String>> ICONS=Map.of(
        "PERSON",Set.of("PERSON","TEAM","LEADER","WORKER"),
        "PROCESS",Set.of("CHECKLIST","GEAR","FLOW","DELIVERY","PRODUCTION","PURCHASING","STOCK_CONTROL","QUALITY","SERVICE_DELIVERY","SALES_PROCESS","PROSPECTING","MARKETING","CUSTOMER_CARE","AFTER_SALES","BILLING","COLLECTIONS_PROCESS","PAYMENTS_PROCESS","HIRING","ONBOARDING","PAYROLL_PROCESS","MAINTENANCE_PROCESS","ADMINISTRATION"),
        "PRODUCT",Set.of("BOX","SERVICE","COFFEE","FOOD","TOOLS","PHONE","GROCERY","BAKERY","FASHION","FOOTWEAR","BEAUTY","HEALTH","PHARMACY","EDUCATION","PROFESSIONAL","SOFTWARE","CONSTRUCTION","REAL_ESTATE","AUTOMOTIVE","TRANSPORT","TOURISM","EVENTS","FITNESS","HOME_GOODS","AGRICULTURE","PETS","CLEANING","MANUFACTURING","CRM","POS","SALES_FUNNEL","STORE","MARKETPLACE","DISTRIBUTORS","PARTNERS","REFERRALS","ONLINE","SOCIAL","CHAT","EMAIL","WHATSAPP","PHONE_SALES","SEO","GOOGLE_ADS","AI_ADS","META_ADS","TIKTOK_ADS","YOUTUBE","ACTIVATIONS","TRADE_SHOW","INFLUENCERS"),
        "FINANCE",Set.of("BALANCE","INCOME","CASH_FLOW","EQUITY_CHANGES","TRIAL_BALANCE","LEDGER_DETAIL","FINANCIAL_CLOSE","FINANCIAL_PULSE","PROFIT_BRIDGE","CASH_BRIDGE","FINANCIAL_TREND","UNIT_RESULTS","BUDGET","COSTS","EXPENSE_REPORT","EXPENSE_AGING","TAX_REPORT","RECEIVABLE_REPORT","RECEIVABLE_AGING","UPCOMING_COLLECTIONS","PETTY_CASH_STATEMENT","FUND_BALANCES","CASH_RECONCILIATION","SALES_REPORT","POS_CLOSING","PAYROLL_REPORT","SALES_COMMISSION"));
    public IdeaWorkspaceService(IdeaWorkspaceRepository repository,IdeasBoardRepository boards,IdeasBoardService canvas,ModuleAccessService modules,Validator validator) { this.repository=repository;this.boards=boards;this.canvas=canvas;this.modules=modules;this.validator=validator; }
    @Transactional(readOnly=true) public SystemBoard system(AuthSessionUser a) { return repository.system(a).map(IdeaWorkspaceRepository.SystemRow::board).orElseGet(()->new SystemBoard(emptySystem(),0,null,IdeaWorkspaceRepository.actor(a))); }
    private void lock(AuthSessionUser a,String actor) {
        require(IdeaWorkspaceRepository.actor(a).equals(actor),HttpStatus.CONFLICT,"ideas_board_actor_changed");
        boards.lock(a);require(modules.companyCanAccessForMutation(a.companyId(),"ideas_board"),HttpStatus.FORBIDDEN,"ideas_board_unavailable");
    }
    @Transactional public SystemBoard saveSystem(AuthSessionUser a,String actor,SystemInput input) {
        require(input!=null && validator.validate(input).isEmpty(),HttpStatus.BAD_REQUEST,"ideas_board_invalid");uuid(input.mutationId());lock(a,actor);validate(a,input.content());
        String digest=digest(repository.encode(input.content()));var previous=repository.system(a);
        if(previous.isPresent() && input.mutationId().equals(previous.get().mutationId())) {
            require(previous.get().digest().equals(digest) && previous.get().board().version()==input.version()+1,HttpStatus.CONFLICT,"ideas_board_conflict");return previous.get().board();
        }
        require(previous.map(r->r.board().version()).orElse(0L)==input.version(),HttpStatus.CONFLICT,"ideas_board_conflict");
        require(repository.saveSystem(a,input,digest),HttpStatus.CONFLICT,"ideas_board_conflict");
        repository.audit(a,"SYSTEM_SAVED",null,input.content().elements().size(),input.content().connections().size());return system(a);
    }
    @Transactional(readOnly=true) public ProjectPage projects(AuthSessionUser a,String q,int page,int size) {
        require(q!=null&&q.length()<=120&&page>=1&&page<=100000&&size>=1&&size<=50,HttpStatus.BAD_REQUEST,"ideas_board_invalid");return repository.projects(a,q.trim(),page,size);
    }
    @Transactional(readOnly=true) public Project project(AuthSessionUser a,String id) { uuid(id);return repository.project(a,id).map(IdeaWorkspaceRepository.ProjectRow::project).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND)); }
    @Transactional public Project saveProject(AuthSessionUser a,String actor,String id,ProjectInput input) {
        require(input!=null&&validator.validate(input).isEmpty(),HttpStatus.BAD_REQUEST,"ideas_board_invalid");uuid(id);lock(a,actor);
        require(!input.name().isBlank()&&input.name().chars().noneMatch(c->c<32||c==127),HttpStatus.BAD_REQUEST,"ideas_board_invalid");
        boolean free="FREEFORM".equals(input.kind());require(free?input.freeform()!=null&&input.system()==null:input.system()!=null&&input.freeform()==null,HttpStatus.BAD_REQUEST,"ideas_board_invalid");
        int nodes,connections;
        if(free) { canvas.validateSnapshot(a,input.freeform(),IdeasBoardScope.PERSONAL);nodes=input.freeform().nodes().size();connections=input.freeform().connections().size(); }
        else { validate(a,input.system());nodes=input.system().elements().size();connections=input.system().connections().size(); }
        var normalized=new ProjectInput(input.name().trim(),input.kind(),input.freeform(),input.system());String digest=digest(repository.encode(normalized));var previous=repository.project(a,id);
        if(previous.isPresent()) { require(previous.get().digest().equals(digest),HttpStatus.CONFLICT,"ideas_board_conflict");return previous.get().project(); }
        require(repository.count(a)<200,HttpStatus.UNPROCESSABLE_ENTITY,"ideas_board_project_limit");
        repository.insert(a,id,normalized,digest,nodes,connections);repository.audit(a,"PROJECT_SAVED",id,nodes,connections);return project(a,id);
    }
    private void validate(AuthSessionUser a,SystemDocument content) {
        require(content!=null&&validator.validate(content).isEmpty(),HttpStatus.BAD_REQUEST,"ideas_board_invalid");
        var knownIcons=new HashSet<String>();ICONS.values().forEach(knownIcons::addAll);knownIcons.add("IDEA");
        for(var e:content.elements()) {
            var n=e.node();String category=e.category();
            require(knownIcons.contains(e.icon()),HttpStatus.BAD_REQUEST,"ideas_board_invalid");
            require(Set.of("IMAGE","DRAWING","VIDEO","AUDIO").contains(n.kind())||!n.text().isBlank()||"IDEA".equals(e.icon())&&Set.of("RECTANGLE","ELLIPSE","TRIANGLE","DIAMOND","PENTAGON","HEXAGON","PARALLELOGRAM").contains(n.shape()),HttpStatus.BAD_REQUEST,"ideas_board_invalid");
            boolean right=n.x()+n.width()/2>=1100,bottom=n.y()+n.height()/2>=800;
            String expected=bottom?(right?"PRODUCT":"FINANCE"):(right?"PROCESS":"PERSON");
            boolean inside=n.x()>=0&&n.y()>=0&&n.x()+n.width()<=2200&&n.y()+n.height()<=1600;
            if("OUTSIDE".equals(category))require(!inside&&"IDEA".equals(e.icon())&&n.x()>=-1200&&n.y()>=-900&&n.x()+n.width()<=3400&&n.y()+n.height()<=2500,HttpStatus.BAD_REQUEST,"ideas_board_invalid");
            else require(expected.equals(category)&&inside,HttpStatus.BAD_REQUEST,"ideas_board_invalid");
        }
        // The shared technical validator checks UUIDs, finite geometry, arrows and private photo ownership.
        // This owner has its own wider zoom range for a four-area overview.
        var document=new IdeasBoardContracts.Document(content.elements().stream().map(Element::node).toList(),content.connections(),new IdeasBoardContracts.Viewport(0d,0d,1d));
        canvas.validateSnapshot(a,document,IdeasBoardScope.PERSONAL);digest(repository.encode(content));
    }
    private static void uuid(String id) { try { require(id!=null&&UUID.fromString(id).toString().equals(id),HttpStatus.BAD_REQUEST,"ideas_board_invalid"); } catch(IllegalArgumentException error) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"ideas_board_invalid"); } }
    private static String digest(String json) { byte[] bytes=json.getBytes(StandardCharsets.UTF_8);require(bytes.length<=512*1024,HttpStatus.BAD_REQUEST,"ideas_board_invalid");try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); } catch(java.security.NoSuchAlgorithmException error) { throw new IllegalStateException(error); } }
    private static void require(boolean condition,HttpStatus status,String code) { if(!condition)throw new ResponseStatusException(status,code); }
}
