package com.indice.erp.pos.mercadopago;

import com.indice.erp.access.tab.*;
import com.indice.erp.auth.*;
import com.indice.erp.pos.*;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MpTerminalControllerAccessTest {
    @Test void saleTabAdminCanReadTerminalSetupList() {
        var session=new MockHttpSession(); var base=mock(PosRequestGuard.class);
        var auth=mock(SessionAuthService.class); var tabs=mock(TabPermissionAccessService.class);
        var user=new AuthSessionUser(11L,42L,"Admin","admin");
        var allowed=new PosRequestGuard.Result(
            new PosContext(11L,42L,"Admin","admin",true,PosScope.corporateOffice()),null);
        when(base.requireAdminReadAccess(session)).thenReturn(allowed);
        when(auth.currentUser(session)).thenReturn(Optional.of(user));
        when(tabs.canAccess(user,TabPermissionRequirement.any("pos.sale","pos.cortes"))).thenReturn(true);
        var store=mock(MpTerminalStore.class); when(store.list(allowed.context())).thenReturn(List.of());
        var controller=new MpTerminalController(new PaymentTerminalRequestGuard(base,auth,tabs),store,
            mock(MpTerminalSync.class),mock(MpTerminalConfigure.class),mock(MpSecrets.class));
        assertThat(controller.list(session).getStatusCode().value()).isEqualTo(200);
        verify(store).list(allowed.context());
    }
}
