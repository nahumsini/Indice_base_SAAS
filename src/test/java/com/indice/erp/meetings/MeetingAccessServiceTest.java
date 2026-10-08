package com.indice.erp.meetings;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.auth.*;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.web.server.ResponseStatusException;

class MeetingAccessServiceTest {
    private final SessionAuthService auth=mock(SessionAuthService.class);
    private final SessionCsrfService csrf=new SessionCsrfService();
    private final ModuleAccessService modules=mock(ModuleAccessService.class);
    private final TabPermissionAccessService tabs=mock(TabPermissionAccessService.class);
    private final MeetingAccessService access=new MeetingAccessService(auth,csrf,modules,tabs);
    private final MockHttpSession session=new MockHttpSession();
    private final AuthSessionUser actor=new AuthSessionUser(10L,20L,"Synthetic","root");
    @BeforeEach void setup(){when(auth.currentUser(session)).thenReturn(Optional.of(actor));when(modules.canAccess(actor,"control_minutas")).thenReturn(true);when(tabs.canAccess(eq(actor),any(TabPermissionRequirement.class))).thenReturn(true);}
    @Test void anonymousIsUnauthorized(){when(auth.currentUser(session)).thenReturn(Optional.empty());assertThatThrownBy(()->require(false)).isInstanceOfSatisfying(ResponseStatusException.class,e->assertThat(e.getStatusCode().value()).isEqualTo(401));}
    @Test void rootNeedsEntitlement(){when(modules.canAccess(actor,"control_minutas")).thenReturn(false);forbidden(()->require(false));}
    @Test void publicDemoIsRejected(){when(auth.isPublicDemoSession(session)).thenReturn(true);forbidden(()->require(false));}
    @Test void nativeTabScopeIsRequired(){when(tabs.canAccess(eq(actor),any(TabPermissionRequirement.class))).thenReturn(false);forbidden(()->require(false));verify(tabs).canAccess(actor,new TabPermissionRequirement(List.of("control_minutas.meetings")));}
    @Test void sessionMutationsRequireCsrf(){forbidden(()->require(true));assertThat(access.require(session,List.of("agreements"),csrf.ensureCsrf(session),true)).isEqualTo(actor);}
    private AuthSessionUser require(boolean write){return access.require(session,List.of("meetings"),null,write);}
    private void forbidden(Runnable action){assertThatThrownBy(action::run).isInstanceOfSatisfying(ResponseStatusException.class,e->assertThat(e.getStatusCode().value()).isEqualTo(403));}
}
