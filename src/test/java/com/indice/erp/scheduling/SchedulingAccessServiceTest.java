package com.indice.erp.scheduling;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.auth.*;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.web.server.ResponseStatusException;

class SchedulingAccessServiceTest {
    private final SessionAuthService auth=mock(SessionAuthService.class);
    private final SessionCsrfService csrf=new SessionCsrfService();
    private final ModuleAccessService modules=mock(ModuleAccessService.class);
    private final TabPermissionAccessService tabs=mock(TabPermissionAccessService.class);
    private final SchedulingAccessService access=new SchedulingAccessService(auth,csrf,modules,tabs);
    private final MockHttpSession session=new MockHttpSession();
    private final AuthSessionUser user=new AuthSessionUser(10L,20L,"Synthetic","root");
    @BeforeEach void setup(){
        when(auth.currentUser(session)).thenReturn(Optional.of(user));
        when(modules.canAccess(user,"scheduling")).thenReturn(true);
        when(tabs.canAccess(eq(user),any(TabPermissionRequirement.class))).thenReturn(true);
    }
    @Test void anonymousRequestsAreUnauthorized(){
        when(auth.currentUser(session)).thenReturn(Optional.empty());
        assertThatThrownBy(()->access.require(session,"calendar",null,false))
            .isInstanceOfSatisfying(ResponseStatusException.class,e->assertThat(e.getStatusCode().value()).isEqualTo(401));
        verifyNoInteractions(modules,tabs);
    }
    @Test void evenRootNeedsCompanyEntitlementAndDemoIsRejected(){
        when(modules.canAccess(user,"scheduling")).thenReturn(false);
        forbidden(()->access.require(session,"calendar",null,false));
        when(modules.canAccess(user,"scheduling")).thenReturn(true);
        when(auth.isPublicDemoSession(session)).thenReturn(true);
        forbidden(()->access.require(session,"calendar",null,false));
    }
    @Test void tabScopeIsAuthoritativeAndAnyScopeUsesTheNativeCatalog(){
        when(tabs.canAccess(eq(user),any(TabPermissionRequirement.class))).thenReturn(false);
        forbidden(()->access.require(session,"configuration",null,false));
        verify(tabs).canAccess(user,new TabPermissionRequirement(List.of("scheduling.configuration")));
        when(tabs.canAccess(eq(user),any(TabPermissionRequirement.class))).thenReturn(true);
        assertThat(access.requireAny(session,List.of("events","reservations"),null,false)).isEqualTo(user);
        verify(tabs).canAccess(user,new TabPermissionRequirement(List.of("scheduling.events","scheduling.reservations")));
    }
    @Test void sessionMutationsRequireCsrfBeforeReturningAnAuthorizedActor(){
        forbidden(()->access.require(session,"reservations",null,true));
        forbidden(()->access.require(session,"reservations","wrong",true));
        assertThat(access.require(session,"reservations",csrf.ensureCsrf(session),true)).isEqualTo(user);
    }
    private void forbidden(Runnable action){assertThatThrownBy(action::run).isInstanceOfSatisfying(ResponseStatusException.class,
        e->assertThat(e.getStatusCode().value()).isEqualTo(403));}
}
