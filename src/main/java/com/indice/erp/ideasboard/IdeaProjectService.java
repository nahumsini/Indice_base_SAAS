package com.indice.erp.ideasboard;

import static com.indice.erp.ideasboard.IdeaWorkspaceContracts.*;
import static com.indice.erp.ideasboard.IdeaProjectContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import com.indice.erp.sales.funneling.*;
import com.indice.erp.sales.funneling.IdeasBoardContracts.*;
import jakarta.validation.Validator;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class IdeaProjectService {
    private final IdeaProjectRepository projects;private final IdeaWorkspaceRepository workspace;
    private final IdeaWorkspaceService snapshots;private final IdeasBoardRepository boards;private final IdeasBoardService canvas;
    private final ModuleAccessService modules;private final TabPermissionAccessService tabs;private final Validator validator;
    public IdeaProjectService(IdeaProjectRepository projects,IdeaWorkspaceRepository workspace,IdeaWorkspaceService snapshots,IdeasBoardRepository boards,IdeasBoardService canvas,ModuleAccessService modules,TabPermissionAccessService tabs,Validator validator){this.projects=projects;this.workspace=workspace;this.snapshots=snapshots;this.boards=boards;this.canvas=canvas;this.modules=modules;this.tabs=tabs;this.validator=validator;}
    private boolean available(AuthSessionUser a){return modules.canAccess(a,"ideas_board")&&tabs.canAccess(a,TabPermissionRequirement.one("ideas_board.canvas"));}
    private void access(AuthSessionUser a){require(projects.member(a,a.userId()).filter(this::available).isPresent(),HttpStatus.FORBIDDEN,"ideas_board_unavailable");}
    private void mutation(AuthSessionUser a,String actor){require(IdeaWorkspaceRepository.actor(a).equals(actor),HttpStatus.CONFLICT,"ideas_board_actor_changed");access(a);boards.lock(a);require(modules.companyCanAccessForMutation(a.companyId(),"ideas_board"),HttpStatus.FORBIDDEN,"ideas_board_unavailable");}
    private IdeaProjectRepository.Row row(AuthSessionUser a,long owner,String id,boolean lock){uuid(id);require(owner>0,HttpStatus.BAD_REQUEST,"ideas_board_invalid");return projects.find(a,owner,id,lock).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"ideas_board_project_unavailable"));}
    private IdeaProjectRepository.Row readable(AuthSessionUser a,long owner,String id,boolean lock){var r=row(a,owner,id,lock);require(owner==a.userId()||r.summary().deletedAt()==null&&projects.granted(a,owner,id),HttpStatus.NOT_FOUND,"ideas_board_project_unavailable");return r;}
    private Project result(IdeaProjectRepository.Row r){return new Project(r.summary(),r.input().freeform(),r.input().system());}
    @Transactional(readOnly=true) public ProjectPage list(AuthSessionUser a,String query,int page,int size,String scope){return list(a,query,page,size,scope,"ALL","NEWEST");}
    @Transactional(readOnly=true) public ProjectPage list(AuthSessionUser a,String query,int page,int size,String scope,String kind,String sort){
        access(a);require(query!=null&&query.length()<=120&&page>=1&&page<=100000&&size>=1&&size<=50&&Set.of("OWNED","SHARED","TRASH").contains(scope)&&Set.of("ALL","FREEFORM","SYSTEM").contains(kind)&&Set.of("NEWEST","OLDEST","NAME_ASC","NAME_DESC").contains(sort),HttpStatus.BAD_REQUEST,"ideas_board_invalid");
        return projects.list(a,query.trim(),page,size,scope,kind,sort);
    }
    @Transactional(readOnly=true) public Project get(AuthSessionUser a,Long owner,String id){access(a);return result(readable(a,owner==null?a.userId():owner,id,false));}
    @Transactional(readOnly=true) public List<Member> members(AuthSessionUser a,String query){access(a);require(query!=null&&query.length()<=120,HttpStatus.BAD_REQUEST,"ideas_board_invalid");return projects.candidates(a,query.trim()).stream().filter(this::available).map(m->new Member(m.userId(),m.userName(),true)).distinct().toList();}
    @Transactional(readOnly=true) public Sharing sharing(AuthSessionUser a,String id){access(a);var r=row(a,a.userId(),id,false);require(r.summary().deletedAt()==null,HttpStatus.NOT_FOUND,"ideas_board_project_unavailable");return new Sharing(r.summary().version(),projects.shares(a,id).stream().map(m->new Member(m.id(),m.name(),projects.member(a,m.id()).filter(this::available).isPresent())).toList());}
    private boolean begin(IdeaProjectRepository.Row r,long version,String mutation,String digest){uuid(mutation);require(version>=0,HttpStatus.BAD_REQUEST,"ideas_board_invalid");if(mutation.equals(r.mutation())){require(digest.equals(r.digest())&&r.summary().version()==version+1,HttpStatus.CONFLICT,"ideas_board_conflict");return false;}require(r.summary().version()==version,HttpStatus.CONFLICT,"ideas_board_conflict");return true;}
    private void finish(AuthSessionUser a,IdeaProjectRepository.Row r,String mutation,String digest,String event){projects.finish(a,r.summary().id(),mutation,digest);workspace.audit(a,event,r.summary().id(),r.summary().nodeCount(),r.summary().connectionCount());}
    @Transactional public Project change(AuthSessionUser a,String actor,String id,Change input){
        require(input!=null&&validator.validate(input).isEmpty()&&(input.name()!=null) != (input.trashed()!=null),HttpStatus.BAD_REQUEST,"ideas_board_invalid");
        String name=input.name()==null?null:name(input.name());String digest=digest(workspace.encode(new Change(input.version(),input.mutationId(),name,input.trashed())));
        mutation(a,actor);var r=row(a,a.userId(),id,true);if(!begin(r,input.version(),input.mutationId(),digest))return result(r);
        if(name!=null){require(r.summary().deletedAt()==null,HttpStatus.CONFLICT,"ideas_board_project_trashed");projects.rename(a,id,name);}
        else if(!input.trashed()){require(workspace.count(a)<200||r.summary().deletedAt()==null,HttpStatus.UNPROCESSABLE_ENTITY,"ideas_board_project_limit");projects.trash(a,id,false);}
        else projects.trash(a,id,true);
        finish(a,r,input.mutationId(),digest,name!=null?"PROJECT_RENAMED":input.trashed()?"PROJECT_TRASHED":"PROJECT_RESTORED");return result(row(a,a.userId(),id,false));
    }
    @Transactional public Sharing share(AuthSessionUser a,String actor,String id,ShareChange input){
        require(input!=null&&validator.validate(input).isEmpty(),HttpStatus.BAD_REQUEST,"ideas_board_invalid");var users=new TreeSet<>(input.userIds());require(users.size()==input.userIds().size()&&!users.contains(a.userId()),HttpStatus.BAD_REQUEST,"ideas_board_invalid");
        String digest=digest(workspace.encode(new ShareChange(input.version(),input.mutationId(),List.copyOf(users))));mutation(a,actor);var r=row(a,a.userId(),id,true);
        if(!begin(r,input.version(),input.mutationId(),digest))return sharing(a,id);
        require(r.summary().deletedAt()==null,HttpStatus.NOT_FOUND,"ideas_board_project_unavailable");
        for(long user:users)require(projects.member(a,user).filter(this::available).isPresent(),HttpStatus.BAD_REQUEST,"ideas_board_recipient_unavailable");
        projects.setShares(a,id,users);finish(a,r,input.mutationId(),digest,"PROJECT_SHARING_CHANGED");return sharing(a,id);
    }
    @Transactional public Project copy(AuthSessionUser a,String actor,long owner,String id,String target,Copy input){
        require(input!=null&&validator.validate(input).isEmpty(),HttpStatus.BAD_REQUEST,"ideas_board_invalid");uuid(id);uuid(target);require(owner>0,HttpStatus.BAD_REQUEST,"ideas_board_invalid");String name=name(input.name()),digest=digest(owner+":"+id+":"+name);
        mutation(a,actor);var previous=projects.find(a,a.userId(),target,true);
        if(previous.isPresent()){var r=previous.get();require(Objects.equals(r.copyOwner(),owner)&&id.equals(r.copyId())&&digest.equals(r.copyDigest()),HttpStatus.CONFLICT,"ideas_board_conflict");return result(r);}
        var source=readable(a,owner,id,true);require(source.summary().deletedAt()==null,HttpStatus.NOT_FOUND,"ideas_board_project_unavailable");require(workspace.count(a)<200,HttpStatus.UNPROCESSABLE_ENTITY,"ideas_board_project_limit");
        var inputContent=source.input();Map<String,String> assets=Map.of();
        if(owner!=a.userId()){
            var assetIds=nodes(inputContent).stream().map(Node::assetId).filter(Objects::nonNull).distinct().toList();
            var sourceActor=new AuthSessionUser(owner,a.companyId(),"Project owner","user");
            var approved=assetIds.stream().map(asset->canvas.asset(sourceActor,asset,IdeasBoardScope.PERSONAL)).toList();
            assets=canvas.copyPersonalAssetReferences(a,approved);
        }
        var mapping=assets;
        var free=inputContent.freeform()==null?null:new Document(inputContent.freeform().nodes().stream().map(n->remap(n,mapping)).toList(),inputContent.freeform().connections(),inputContent.freeform().viewport());
        var system=inputContent.system()==null?null:new SystemDocument(inputContent.system().elements().stream().map(e->new Element(remap(e.node(),mapping),e.category(),e.icon(),e.steps(),e.offeringType())).toList(),inputContent.system().connections(),inputContent.system().viewport());
        snapshots.saveProject(a,actor,target,new ProjectInput(name,inputContent.kind(),free,system));projects.copySource(a,target,owner,id,digest);workspace.audit(a,"PROJECT_COPIED",target,source.summary().nodeCount(),source.summary().connectionCount());return result(row(a,a.userId(),target,false));
    }
    @Transactional(readOnly=true) public StoredAsset asset(AuthSessionUser a,long owner,String id,String asset){access(a);uuid(asset);var r=readable(a,owner,id,false);require((owner==a.userId()||r.summary().deletedAt()==null)&&nodes(r.input()).stream().anyMatch(n->asset.equals(n.assetId())),HttpStatus.NOT_FOUND,"ideas_board_photo_not_found");return canvas.asset(new AuthSessionUser(owner,a.companyId(),"Project owner","user"),asset,IdeasBoardScope.PERSONAL);}
    private static List<Node> nodes(ProjectInput input){return input.freeform()!=null?input.freeform().nodes():input.system().elements().stream().map(Element::node).toList();}
    private static Node remap(Node n,Map<String,String> assets){return new Node(n.id(),n.kind(),n.text(),n.x(),n.y(),n.width(),n.height(),n.shape(),n.color(),n.assetId()==null?null:assets.getOrDefault(n.assetId(),n.assetId()),n.appearance(),n.drawing(),n.catalog());}
    private static String name(String name){require(name!=null&&!name.isBlank()&&name.trim().length()<=120&&name.chars().noneMatch(c->c<32||c==127),HttpStatus.BAD_REQUEST,"ideas_board_invalid");return name.trim();}
    private static void uuid(String id){try{require(id!=null&&UUID.fromString(id).toString().equals(id),HttpStatus.BAD_REQUEST,"ideas_board_invalid");}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"ideas_board_invalid");}}
    private static String digest(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
    private static void require(boolean ok,HttpStatus status,String code){if(!ok)throw new ResponseStatusException(status,code);}
}
