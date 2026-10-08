package com.indice.erp.learning;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.ai.learning.AiLearningProgressActionService;
import com.indice.erp.ai.learning.AiLearningProgressActionService.Commit;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.learning.LearningProgressContracts.Change;
import java.time.Instant;
import java.util.*;
import java.util.function.Supplier;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties={"app.email.enabled=false","app.entitlements.projection-enabled=false"})
@Transactional
class LearningProgressIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired LearningProgressService learning;
    @Autowired LearningProgressRepository progress;
    @Autowired AiLearningProgressActionService actions;
    @Autowired AiAccessTokenRepository tokens;
    @Autowired AiActionRepository audit;
    @MockBean AiToolAuthorizationService authorization;
    AiAccessTokenRepository.StoredToken token;
    AuthSessionUser actor;
    @BeforeEach void setup() {
        assertThat(jdbc.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        var key=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies(name) VALUES (?)","Synthetic learner "+key);
        var company=jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,"Synthetic learner "+key);
        jdbc.update("INSERT INTO users(email,password_hash,full_name) VALUES (?,'test','Synthetic learner')",key+"@example.test");
        var user=jdbc.queryForObject("SELECT id FROM users WHERE email=?",Long.class,key+"@example.test");
        jdbc.update("INSERT INTO user_companies(user_id,company_id,role,status,visibility) VALUES (?,?,'root','active','all')",user,company);
        var member=jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id=?",Long.class,company);
        actor=new AuthSessionUser(user,company,member,"Synthetic learner","root");
        long id=tokens.insert(actor,"generic_mcp","Isolated learning regression","test",key.replace("-","").repeat(2),Instant.now().plusSeconds(3600),Set.of("learning.read","learning.manage"));
        token=new AiAccessTokenRepository.StoredToken(id,actor,Set.of("learning.read","learning.manage"));
        when(authorization.withCapabilityEvaluation(any())).thenAnswer(i->((Supplier<?>)i.getArgument(0)).get());
        when(authorization.canReadGuideTab(any(),eq("processes"),anyString())).thenReturn(true);
    }
    @Test void previewCommitReplayAndRevocationPreservePrivateProgress() {
        var change=new Change("processes.calendar",2,"understood","en-CA");
        var preview=actions.preview(token,change);
        assertThat(progress.understandings(actor.companyId(),actor.userId())).isEmpty();
        assertThat(preview.consequences().getFirst()).startsWith("Saves");
        var request=new Commit(preview.confirmationToken(),"learning-understand-001");
        var saved=actions.commit(token,request);
        assertThat(saved.replayed()).isFalse();
        assertThat(saved.progress().chapters().getFirst().status()).isEqualTo("understood");
        assertThat(actions.commit(token,request).replayed()).isTrue();
        assertThat(progress.understandings(actor.companyId(),actor.userId())).hasSize(1);
        assertThat(progress.applications(actor.companyId(),actor.userId())).isEmpty();
        assertThat(progress.understandings(actor.companyId()+100000,actor.userId())).isEmpty();
        assertThat(progress.understandings(actor.companyId(),actor.userId()+100000)).isEmpty();
        var otherToken=new AiAccessTokenRepository.StoredToken(token.id()+1,actor,token.scopes());
        assertThatThrownBy(()->actions.commit(otherToken,request)).isInstanceOf(IllegalStateException.class).hasMessageContaining("identity");
        when(authorization.canReadGuideTab(any(),eq("processes"),anyString())).thenReturn(false);
        assertThatThrownBy(()->actions.commit(token,request)).isInstanceOf(SecurityException.class);
    }
    @Test void versionedDurableUnderstandingAndRealEvidenceSurviveReconstruction() {
        learning.update(actor,new Change("processes.calendar",2,"understood"),"es-MX");
        var at=progress.understandings(actor.companyId(),actor.userId()).getFirst().at();
        learning.update(actor,new Change("processes.calendar",2,"understood"),"es-MX");
        assertThat(progress.understandings(actor.companyId(),actor.userId()).getFirst().at()).isEqualTo(at);
        progress.apply(actor.companyId(),actor.userId(),"processes.calendar","create");
        assertThat(new LearningProgressRepository(jdbc).applications(actor.companyId(),actor.userId())).containsKey("processes.calendar");
        assertThat(learning.get(actor,"es-MX").chapters().getFirst().status()).isEqualTo("applied");
        assertThat(progress.applications(actor.companyId(),actor.userId()+100000)).isEmpty();
        audit.insertAudit(token,"create_project",null,"PREVIEW","SUCCESS",UUID.randomUUID().toString(),null,Map.of(),null,null,null);
        assertThat(audit.completedLearningOperations(actor.companyId(),actor.userId())).doesNotContainKey("create_project");
        audit.insertAudit(token,"create_project",null,"COMMIT","SUCCESS",UUID.randomUUID().toString(),null,Map.of(),null,null,null);
        assertThat(learning.get(actor,"es-MX").chapters().stream().filter(c->c.tab().equals("projects")).findFirst().orElseThrow().status()).isEqualTo("applied");
    }
    @Test void writeConsentExpiryAndCurrentVersionFailBeforeChangingProgress() {
        var change=new Change("processes.calendar",2,"understood");
        var readonly=new AiAccessTokenRepository.StoredToken(token.id(),actor,Set.of("learning.read"));
        assertThatThrownBy(()->actions.preview(readonly,change)).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->actions.preview(token,new Change("processes.calendar",1,"understood"))).isInstanceOf(IllegalArgumentException.class);
        var preview=actions.preview(token,change);
        jdbc.update("UPDATE ai_action_confirmations SET expires_at=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 1 MINUTE) WHERE company_id=? AND user_id=?",actor.companyId(),actor.userId());
        var request=new Commit(preview.confirmationToken(),"learning-expired-001");
        assertThatThrownBy(()->actions.commit(readonly,request)).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->actions.commit(token,request)).isInstanceOf(IllegalStateException.class).hasMessageContaining("unavailable");
        assertThat(progress.understandings(actor.companyId(),actor.userId())).isEmpty();
    }
}
