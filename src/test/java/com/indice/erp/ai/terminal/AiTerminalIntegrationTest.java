package com.indice.erp.ai.terminal;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.pos.assistant.*;
import com.indice.erp.pos.assistant.PosTerminalContracts.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Fixtures live only in the ephemeral isolated test DB; no ambient transaction may cover dispatch. */
@SpringBootTest(properties={"app.email.enabled=false","app.entitlements.projection-enabled=false"})
class AiTerminalIntegrationTest {
    @Autowired JdbcTemplate jdbc;@Autowired AiTerminalActionService actions;@Autowired AiAccessTokenRepository tokens;
    @Autowired AiActionRepository repository;@Autowired ObjectMapper mapper;
    @MockBean AiToolAuthorizationService permissions;@MockBean PosTerminalPreparation owner;
    @MockBean PosTerminalDispatch dispatch;@MockBean PosTerminalReadService reads;
    StoredToken token;Prepared prepared;
    @BeforeEach void setup(){
        assertThat(jdbc.queryForObject("SELECT DATABASE()",String.class)).contains("test");String key=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies(name) VALUES (?)","Synthetic terminal "+key);long company=jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,"Synthetic terminal "+key);
        jdbc.update("INSERT INTO users(email,password_hash,full_name) VALUES (?,'test','Synthetic terminal operator')",key+"@example.test");long user=jdbc.queryForObject("SELECT id FROM users WHERE email=?",Long.class,key+"@example.test");
        jdbc.update("INSERT INTO user_companies(user_id,company_id,role,status,visibility) VALUES (?,?,'root','active','all')",user,company);long member=jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id=?",Long.class,company);
        var actor=new AuthSessionUser(user,company,member,"Synthetic terminal operator","root");var scopes=Set.of("pos.read","pos.terminal.manage","pos.returns.manage");long id=tokens.insert(actor,"generic_mcp","Synthetic terminal regression","test",key.replace("-","").repeat(2),Instant.now().plusSeconds(3600),scopes);token=new StoredToken(id,actor,scopes);
        var c=new Change(1L,"SQUARE",null,null,null);prepared=new Prepared("recover_pos_terminal_payment",c,Records.empty(),null,null,"CAD",Map.of());
        when(permissions.canUseTerminalTool(any(),anyString())).thenReturn(true);when(owner.prepare(any(),anyString(),any())).thenReturn(prepared);when(owner.prepare(any(),anyString(),any(),eq(true))).thenReturn(prepared);when(reads.refresh(any(),any())).thenAnswer(a->a.getArgument(1));
    }
    @Test void uncertainExternalResponseKeepsDurableOriginalIdentityForExplicitRecovery(){
        var p=actions.preview(token,prepared.action(),prepared.change());var request=new AiTerminalContracts.CommitRequest(p.confirmationToken(),"terminal-original-001");var identities=new ArrayList<String>();
        when(dispatch.dispatch(any(),any(),anyString())).thenAnswer(a->{
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();String identity=a.getArgument(2);identities.add(identity);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_action_executions WHERE company_id=? AND correlation_id=? AND status='PENDING'",Integer.class,token.user().companyId(),identity)).isEqualTo(1);
            assertThat(jdbc.queryForObject("SELECT consumed_at IS NOT NULL FROM ai_action_confirmations WHERE company_id=? AND tool_name=?",Boolean.class,token.user().companyId(),AiTerminalActionService.internal(prepared.action()))).isTrue();
            if(identities.size()==1)throw new IllegalStateException("Synthetic provider response lost after reservation");
            return new Result(prepared.action(),identity,Records.empty());
        });
        assertThatThrownBy(()->actions.commit(token,prepared.action(),request)).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("SELECT status FROM ai_action_executions WHERE company_id=?",String.class,token.user().companyId())).isEqualTo("PENDING");
        var result=actions.commit(token,prepared.action(),request);assertThat(result.replayed()).isTrue();assertThat(identities).hasSize(2);assertThat(identities.get(0)).isEqualTo(identities.get(1));assertThat(result.result().requestKey()).isEqualTo(identities.getFirst());
        assertThat(actions.commit(token,prepared.action(),request).replayed()).isTrue();verify(dispatch,times(2)).dispatch(any(),any(),eq(identities.getFirst()));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_action_executions WHERE company_id=?",Integer.class,token.user().companyId())).isEqualTo(1);
    }
    @Test void changedReviewRollsBackReservationAndRevocationStopsExternalWork(){
        var p=actions.preview(token,prepared.action(),prepared.change());when(owner.prepare(any(),anyString(),any(),eq(true))).thenReturn(new Prepared(prepared.action(),prepared.change(),Records.empty(),null,null,"MXN",Map.of()));
        assertThatThrownBy(()->actions.commit(token,prepared.action(),new AiTerminalContracts.CommitRequest(p.confirmationToken(),"terminal-changed-001"))).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_action_executions WHERE company_id=?",Integer.class,token.user().companyId())).isZero();
        when(permissions.canUseTerminalTool(any(),anyString())).thenReturn(false);assertThatThrownBy(()->actions.commit(token,prepared.action(),new AiTerminalContracts.CommitRequest(p.confirmationToken(),"terminal-revoked-001"))).isInstanceOf(SecurityException.class);verifyNoInteractions(dispatch);
    }
    @Test void terminalInputsRejectForgedAuthorityAndManualPaymentState() throws Exception {
        assertThatThrownBy(()->mapper.readValue("{\"provider\":\"SQUARE\",\"checkout\":{\"cashRegisterId\":1,\"companyId\":999}}",Change.class)).hasMessageContaining("companyId");
        assertThatThrownBy(()->mapper.readValue("{\"id\":1,\"provider\":\"SQUARE\",\"paid\":true}",Change.class)).hasMessageContaining("paid");
    }
}
