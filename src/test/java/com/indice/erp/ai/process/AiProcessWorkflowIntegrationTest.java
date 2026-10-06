package com.indice.erp.ai.process;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.processTasks.assistant.ProcessAssistantContracts.*;
import com.indice.erp.processTasks.assistant.ProcessAssistantService;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.TransactionDefinition;

@SpringBootTest(properties={"app.email.enabled=false","app.entitlements.projection-enabled=false"})
@Transactional
class AiProcessWorkflowIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired AiAccessTokenRepository tokens;
    @Autowired AiProcessActionService actions;
    @Autowired ProcessAssistantService owner;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    @MockitoBean AiToolAuthorizationService authorization;
    StoredToken token;long company,unit,business;
    @BeforeEach void fixture(){
        String unique=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies(name) VALUES(?)","Synthetic process "+unique);
        company=jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,"Synthetic process "+unique);
        jdbc.update("INSERT INTO users(email,password_hash,full_name) VALUES(?,'test','Synthetic process operator')",unique+"@example.test");
        long user=jdbc.queryForObject("SELECT id FROM users WHERE email=?",Long.class,unique+"@example.test");
        jdbc.update("INSERT INTO user_companies(user_id,company_id,role,status,visibility) VALUES(?,?,'root','active','all')",user,company);
        long member=jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,user);
        jdbc.update("INSERT INTO units(company_id,name,status) VALUES(?,'Synthetic unit','active')",company);
        unit=jdbc.queryForObject("SELECT id FROM units WHERE company_id=?",Long.class,company);
        jdbc.update("INSERT INTO businesses(company_id,unit_id,name,status) VALUES(?,?,'Synthetic business','active')",company,unit);
        business=jdbc.queryForObject("SELECT id FROM businesses WHERE company_id=?",Long.class,company);
        var actor=new AuthSessionUser(user,company,member,"Synthetic process operator","root");
        var scopes=Set.of("projects.read","projects.manage","processes.read","processes.manage","processes.run");
        long id=tokens.insert(actor,"generic_mcp","Synthetic workflows","test",unique.replace("-","")+UUID.randomUUID().toString().replace("-",""),Instant.now().plusSeconds(3600),scopes);
        token=new StoredToken(id,actor,scopes);when(authorization.canUseProcessWorkflowTool(any(),anyString())).thenReturn(true);
    }
    @Test void projectLifecyclePreservesTasksAndRequiresCurrentConsent(){
        var c=new ProjectChange("Synthetic project","Description","active","medium",token.user().userCompanyId(),"Synthetic owner",unit,business,LocalDate.now(),LocalDate.now().plusDays(10));
        var input=new Change(null,c,null,null);var preview=actions.preview(token,"create_project",input);
        assertThat(count("projects")).isZero();assertThat(preview.after().project().configuration()).isEqualTo(c);
        var request=new AiProcessContracts.CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString());
        long id=actions.commit(token,"create_project",request).result().project().id();
        assertThat(actions.commit(token,"create_project",request).replayed()).isTrue();assertThat(count("projects")).isEqualTo(1);
        assertThat(apply("complete_project",new Change(id,null,null,null)).project().configuration().status()).isEqualTo("completed");
        assertThat(apply("cancel_project",new Change(id,null,null,null)).project().configuration().status()).isEqualTo("cancelled");
        assertThat(count("process_tasks")).isZero();
        assertThatThrownBy(()->actions.preview(new StoredToken(token.id(),token.user(),Set.of("projects.read")),"archive_project",new Change(id,null,null,null))).isInstanceOf(SecurityException.class);
        var archive=actions.preview(token,"archive_project",new Change(id,null,null,null));var archiveRequest=new AiProcessContracts.CommitRequest(archive.confirmationToken(),UUID.randomUUID().toString());
        assertThat(actions.commit(token,"archive_project",archiveRequest).result().archived()).isTrue();
        assertThat(actions.commit(token,"archive_project",archiveRequest).replayed()).isTrue();
        assertThat(owner.projects(token.user(),null).totalCount()).isZero();assertThat(count("projects")).isEqualTo(1);
    }
    @Test void occasionalRunsKeepPublishedVersionAndDuplicateReferenceNeedsReview(){
        var input=new Change(null, null,definition("Original process","occasional"),null);
        var preview=actions.preview(token,"create_process",input);
        assertThat(count("processes")).isZero();assertThat(count("process_versions")).isZero();assertThat(count("process_tasks")).isZero();
        long id=apply("create_process",input).process().id();
        assertThat(owner.version(token.user(),id,1).templates()).hasSize(1);
        var run=new Change(id,null,null,new RunChange("Synthetic report",LocalDate.now(),"Notes",false));
        var runPreview=actions.preview(token,"create_process_run",run);assertThat(runPreview.after().occasionalPlan().tasks()).hasSize(1);assertThat(count("process_runs")).isZero();
        var request=new AiProcessContracts.CommitRequest(runPreview.confirmationToken(),UUID.randomUUID().toString());
        var first=actions.commit(token,"create_process_run",request).result().run();
        assertThat(first.version()).isEqualTo(1);assertThat(first.tasks()).hasSize(1);
        assertThat(actions.commit(token,"create_process_run",request).replayed()).isTrue();assertThat(count("process_runs")).isEqualTo(1);
        assertThat(actions.preview(token,"create_process_run",run).after().occasionalPlan().duplicateReference()).isTrue();
        var next=apply("update_process",new Change(id,null,definition("Updated process","occasional"),null));
        assertThat(next.process().currentVersion()).isEqualTo(2);assertThat(owner.run(token.user(),first.id()).version()).isEqualTo(1);
        assertThat(owner.version(token.user(),id,1).title()).isEqualTo("Original process");assertThat(owner.version(token.user(),id,2).title()).isEqualTo("Updated process");
        assertThat(apply("create_process_run",new Change(id,null,null,new RunChange("Synthetic report",LocalDate.now(),null,true))).run().version()).isEqualTo(2);
        var paused=apply("pause_process",new Change(id,null,null,null));assertThat(paused.process().configuration().isActive()).isFalse();assertThat(paused.process().currentVersion()).isEqualTo(2);
        assertThat(count("process_tasks")).isEqualTo(2);assertThat(apply("archive_process",new Change(id,null,null,null)).archived()).isTrue();assertThat(count("process_versions")).isEqualTo(2);assertThat(count("process_runs")).isEqualTo(2);
    }
    @Test void recurringPreviewIncludesEveryGeneratedDateAndRepetitionCreatesNothing(){
        var input=new Change(null,null,definition("Daily process","recurring"),null);
        var preview=actions.preview(token,"create_process",input);
        assertThat(preview.after().recurringPlans()).hasSize(3);assertThat(preview.after().recurringPlans().getFirst().tasks().getFirst().assignees()).containsExactly("Synthetic process operator");
        assertThat(count("process_tasks")).isZero();long id=apply("create_process",input).process().id();
        assertThat(count("process_runs")).isEqualTo(3);assertThat(count("process_tasks")).isEqualTo(3);
        assertThat(actions.preview(token,"generate_process_tasks",new Change(id,null,null,null)).after().recurringPlans()).isEmpty();
        apply("generate_process_tasks",new Change(id,null,null,null));assertThat(count("process_tasks")).isEqualTo(3);
        assertThat(owner.runs(token.user(),id,new PageRequest(null,null,null,null,1,2,null)).hasMore()).isTrue();
    }
    @Test void staleConfigurationAndForeignReferencesFailBeforeMutation(){
        long id=apply("create_process",new Change(null,null,definition("Stale process","occasional"),null)).process().id();
        var input=new Change(id,null,definition("Changed process","occasional"),null);var preview=actions.preview(token,"update_process",input);
        jdbc.update("UPDATE processes SET title='Concurrent edit' WHERE company_id=? AND id=?",company,id);
        var nested=new TransactionTemplate(transactions);nested.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);
        assertThatThrownBy(()->nested.execute(status->actions.commit(token,"update_process",new AiProcessContracts.CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString())))).isInstanceOf(IllegalStateException.class).hasMessageContaining("preparation_changed");
        assertThat(count("process_versions")).isEqualTo(1);
        var project=new ProjectChange("Foreign unit",null,"active",null,null,null,Long.MAX_VALUE,null,null,null);
        assertThatThrownBy(()->actions.preview(token,"create_project",new Change(null,project,null,null))).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(()->owner.process(token.user(),Long.MAX_VALUE)).isInstanceOf(NoSuchElementException.class);
        when(authorization.canUseProcessWorkflowTool(any(),anyString())).thenReturn(false);
        assertThatThrownBy(()->actions.commit(token,"update_process",new AiProcessContracts.CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString()))).isInstanceOf(SecurityException.class);
    }
    private ProcessChange definition(String title,String activation){
        var template=new Template("Synthetic task","Task instructions",null,"medium",unit,business,1,0,1,false,List.of(token.user().userCompanyId()));
        return new ProcessChange(title,"Process instructions","daily","medium",unit,business,token.user().userCompanyId(),token.user().userCompanyId(),"individual",activation,"parallel",true,true,LocalDate.now(),null,0,2,false,null,List.of(template));
    }
    private Result apply(String action,Change change){var preview=actions.preview(token,action,change);return actions.commit(token,action,new AiProcessContracts.CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString())).result();}
    private long count(String table){return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=?",Long.class,company);}
}
