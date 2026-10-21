package com.indice.erp.sales.funneling;

import com.indice.erp.auth.*;
import com.indice.erp.ideasboard.*;
import static com.indice.erp.ideasboard.IdeaWorkspaceContracts.*;
import static com.indice.erp.ideasboard.IdeaProjectContracts.*;
import static com.indice.erp.sales.funneling.IdeasBoardContracts.*;
import static com.indice.erp.sales.funneling.IdeasBoardScope.PERSONAL;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.http.MediaType;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class IdeaProjectManagementIntegrationTest extends IdeaWorkspaceIntegrationTest {
    @Autowired IdeaProjectService management;
    AuthSessionUser member(long tenant,boolean grant){
        long id=insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic-only','Team test')","team-"+UUID.randomUUID()+"@example.com");
        long uc=insert("INSERT INTO user_companies(user_id,company_id,role,status) VALUES(?,?,'user','active')",id,tenant);
        if(grant){db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'ideas_board','user')",uc);db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'ideas_board','canvas')",uc);}
        return new AuthSessionUser(id,tenant,uc,"Team test","user");
    }
    MockHttpSession session(AuthSessionUser a){var s=new MockHttpSession();s.setAttribute(SessionAuthService.SESSION_USER_ID,a.userId());s.setAttribute(SessionAuthService.SESSION_COMPANY_ID,a.companyId());s.setAttribute(SessionAuthService.SESSION_USER_NAME,"Synthetic");s.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF,"synthetic-csrf");return s;}
    String project(){String id=UUID.randomUUID().toString();workspace.saveProject(actor,key(),id,projectInput("Diagnóstico equipo"));return id;}
    ShareChange sharing(long version,Long... people){return new ShareChange(version,UUID.randomUUID().toString(),List.of(people));}
    @Test void managementRenamesWithCasAndIdempotencyWithoutChangingTheSnapshot(){
        String id=project();var before=workspace.project(actor,id).system();var change=new Change(0,UUID.randomUUID().toString(),"  Nuevo nombre  ",null);
        var result=management.change(actor,key(),id,change);assertThat(result.summary().name()).isEqualTo("Nuevo nombre");assertThat(result.summary().version()).isEqualTo(1);assertThat(result.system()).isEqualTo(before);
        assertThat(management.change(actor,key(),id,change)).isEqualTo(result);
        assertThatThrownBy(()->management.change(actor,key(),id,new Change(0,UUID.randomUUID().toString(),"Stale",null))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->management.change(actor,"wrong",id,new Change(1,UUID.randomUUID().toString(),"Wrong",null))).isInstanceOf(ResponseStatusException.class);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM personal_idea_workspace_audit WHERE company_id=? AND event_type='PROJECT_RENAMED'",Long.class,company)).isEqualTo(1);
    }
    @Test void sharingIsExplicitTenantScopedReadAndCopyOnlyThenRevocable() throws Exception {
        String id=project();var colleague=member(company,true);var ungranted=member(company,true);var noPermission=member(company,false);var foreign=member(other,true);
        var request=sharing(0,colleague.userId());management.share(actor,key(),id,request);assertThat(management.share(actor,key(),id,request).version()).isEqualTo(1);
        assertThat(management.list(colleague,"",1,12,"SHARED").items()).extracting(ProjectSummary::id).containsExactly(id);
        assertThat(management.list(colleague,"",1,12,"OWNED").items()).isEmpty();
        assertThat(management.get(colleague,user,id).summary().owned()).isFalse();
        assertThatThrownBy(()->management.get(ungranted,user,id)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->management.get(foreign,user,id)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->management.change(colleague,IdeaWorkspaceRepository.actor(colleague),id,new Change(1,UUID.randomUUID().toString(),"Attempt",null))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->management.share(actor,key(),id,sharing(1,noPermission.userId()))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->management.share(actor,key(),id,sharing(1,foreign.userId()))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->management.share(actor,key(),id,sharing(1,user))).isInstanceOf(ResponseStatusException.class);
        management.share(actor,key(),id,sharing(1));assertThatThrownBy(()->management.get(colleague,user,id)).isInstanceOf(ResponseStatusException.class);
        assertThat(management.list(colleague,"",1,12,"SHARED").items()).isEmpty();
        mvc.perform(get(URL+"/projects/"+id).param("ownerId",String.valueOf(user)).session(session(colleague))).andExpect(status().isNotFound());
    }
    @Test void trashIsRecoverableHidesSharedAccessAndRestoresPrivately(){
        String id=project();var colleague=member(company,true);management.share(actor,key(),id,sharing(0,colleague.userId()));
        var request=new Change(1,UUID.randomUUID().toString(),null,true);var trashed=management.change(actor,key(),id,request);
        assertThat(trashed.summary().deletedAt()).isNotNull();assertThat(management.change(actor,key(),id,request)).isEqualTo(trashed);
        assertThat(management.list(actor,"",1,12,"OWNED").total()).isZero();assertThat(management.list(actor,"",1,12,"TRASH").total()).isEqualTo(1);
        assertThat(workspace.projects(actor,"",1,12).total()).isZero();assertThatThrownBy(()->management.get(colleague,user,id)).isInstanceOf(ResponseStatusException.class);
        var restored=management.change(actor,key(),id,new Change(2,UUID.randomUUID().toString(),null,false));assertThat(restored.summary().deletedAt()).isNull();assertThat(restored.summary().shareCount()).isZero();assertThat(restored.system()).isEqualTo(trashed.system());
        assertThatThrownBy(()->management.get(colleague,user,id)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void copiesAreIndependentIdempotentAndRespectTheirSourceOwner(){
        String id=project();var colleague=member(company,true);management.share(actor,key(),id,sharing(0,colleague.userId()));String target=UUID.randomUUID().toString();
        var copy=management.copy(colleague,IdeaWorkspaceRepository.actor(colleague),user,id,target,new Copy("Mi copia"));
        assertThat(copy.summary().owned()).isTrue();assertThat(copy.summary().shareCount()).isZero();assertThat(copy.system()).isEqualTo(workspace.project(actor,id).system());
        assertThat(management.copy(colleague,IdeaWorkspaceRepository.actor(colleague),user,id,target,new Copy("Mi copia"))).isEqualTo(copy);
        assertThat(management.list(colleague,"",1,12,"OWNED").total()).isEqualTo(1);
        assertThatThrownBy(()->management.copy(colleague,IdeaWorkspaceRepository.actor(colleague),user,id,target,new Copy("Different"))).isInstanceOf(ResponseStatusException.class);
        management.change(colleague,IdeaWorkspaceRepository.actor(colleague),target,new Change(0,UUID.randomUUID().toString(),"Personal",null));
        assertThat(workspace.project(actor,id).summary().name()).isEqualTo("Diagnóstico equipo");management.share(actor,key(),id,sharing(1));
        assertThat(management.get(colleague,null,target).summary().name()).isEqualTo("Personal");
    }
    @Test void sharedMediaIsProjectScopedAndCopiedMediaRemainsPrivateAfterRevocation() throws Exception {
        when(storage.isEnabled()).thenReturn(true);byte[] bytes=png();String asset=UUID.randomUUID().toString(),unrelated=UUID.randomUUID().toString();service.upload(actor,key(),asset,"team.png","image/png",bytes,PERSONAL);service.upload(actor,key(),unrelated,"private.png","image/png",bytes,PERSONAL);
        when(storage.readObject(anyString(),anyString(),anyInt())).thenReturn(bytes);
        var image=new Node(UUID.randomUUID().toString(),"IMAGE","Photo",50d,150d,180d,120d,"RECTANGLE","BLUE",asset);
        String id=UUID.randomUUID().toString();workspace.saveProject(actor,key(),id,new ProjectInput("Photos","FREEFORM",new Document(List.of(image),List.of(),new Viewport(0d,0d,1d)),null));
        var colleague=member(company,true);management.share(actor,key(),id,sharing(0,colleague.userId()));
        mvc.perform(get(URL+"/projects/"+id+"/assets/"+asset).param("ownerId",String.valueOf(user)).header("Range","bytes=0-9").session(session(colleague))).andExpect(status().isPartialContent()).andExpect(header().string("Cache-Control",org.hamcrest.Matchers.containsString("no-store"))).andExpect(content().bytes(Arrays.copyOfRange(bytes,0,10)));
        mvc.perform(get(URL+"/projects/"+id+"/assets/"+unrelated).param("ownerId",String.valueOf(user)).session(session(colleague))).andExpect(status().isNotFound());
        mvc.perform(get(URL+"/assets/"+asset).session(session(colleague))).andExpect(status().isNotFound());
        String target=UUID.randomUUID().toString();var copy=management.copy(colleague,IdeaWorkspaceRepository.actor(colleague),user,id,target,new Copy("Copia con foto"));String copied=copy.freeform().nodes().getFirst().assetId();assertThat(copied).isNotEqualTo(asset);
        management.share(actor,key(),id,sharing(1));mvc.perform(get(URL+"/projects/"+id+"/assets/"+asset).param("ownerId",String.valueOf(user)).session(session(colleague))).andExpect(status().isNotFound());
        assertThat(service.asset(colleague,copied,PERSONAL).asset().name()).isEqualTo("team.png");
        assertThat(service.bytes(service.asset(colleague,copied,PERSONAL),PERSONAL)).isEqualTo(bytes);
        assertThat(workspace.saveProject(colleague,IdeaWorkspaceRepository.actor(colleague),UUID.randomUUID().toString(),new ProjectInput("Editable copy","FREEFORM",copy.freeform(),null)).freeform().nodes().getFirst().assetId()).isEqualTo(copied);
    }
    @Test void newManagementRoutesRequireSessionCsrfActorAndCurrentPermissions() throws Exception {
        String id=project();var input=new Change(0,UUID.randomUUID().toString(),"Renamed",null);String json=mapper.writeValueAsString(input);
        mvc.perform(patch(URL+"/projects/"+id).contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isUnauthorized());
        mvc.perform(patch(URL+"/projects/"+id).session(session()).header("X-Idea-Board-Actor",key()).contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isForbidden());
        mvc.perform(patch(URL+"/projects/"+id).session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Idea-Board-Actor","other").contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isConflict());
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=?",membership);
        mvc.perform(get(URL+"/projects/members").session(session())).andExpect(status().isForbidden());
        mvc.perform(get(URL+"/projects/"+id).session(session())).andExpect(status().isForbidden());
    }
    @Test void recipientPermissionAndMembershipRevocationTakeEffectOnEveryRead(){
        String id=project();var colleague=member(company,true);management.share(actor,key(),id,sharing(0,colleague.userId()));
        db.update("UPDATE user_companies SET status='inactive' WHERE id=?",colleague.userCompanyId());
        assertThatThrownBy(()->management.get(colleague,user,id)).isInstanceOf(ResponseStatusException.class);
        assertThat(management.sharing(actor,id).members().getFirst().available()).isFalse();
        management.share(actor,key(),id,sharing(1));assertThat(management.sharing(actor,id).members()).isEmpty();
    }
    @Test void ownerQualifiedLinksNeverSelectAnotherUsersProjectWithTheSameId(){
        String id=project();var colleague=member(company,true);
        workspace.saveProject(colleague,IdeaWorkspaceRepository.actor(colleague),id,projectInput("Recipient private original"));
        management.share(actor,key(),id,sharing(0,colleague.userId()));
        assertThat(management.get(colleague,user,id).summary().name()).isEqualTo("Diagnóstico equipo");
        assertThat(management.get(colleague,null,id).summary().name()).isEqualTo("Recipient private original");
        assertThat(management.list(colleague,"",1,12,"SHARED").items().getFirst().ownerId()).isEqualTo(user);
        assertThat(management.list(colleague,"",1,12,"TRASH").total()).isZero();
    }
    @Test void restoringRespectsActiveProjectLimitWithoutLosingTheTrashedSnapshot(){
        String id=project();management.change(actor,key(),id,new Change(0,UUID.randomUUID().toString(),null,true));
        for(int i=0;i<200;i++)db.update("INSERT INTO personal_idea_projects(company_id,user_id,project_id,name,kind,content_json,content_digest,node_count,connection_count) SELECT company_id,user_id,?,name,kind,content_json,content_digest,node_count,connection_count FROM personal_idea_projects WHERE company_id=? AND user_id=? AND project_id=?",UUID.randomUUID().toString(),company,user,id);
        assertThatThrownBy(()->management.change(actor,key(),id,new Change(1,UUID.randomUUID().toString(),null,false))).isInstanceOf(ResponseStatusException.class);
        assertThat(management.get(actor,null,id).summary().deletedAt()).isNotNull();
        assertThat(management.list(actor,"",1,50,"TRASH").total()).isEqualTo(1);
        assertThat(management.list(actor,"",1,50,"OWNED").total()).isEqualTo(200);
    }

}
