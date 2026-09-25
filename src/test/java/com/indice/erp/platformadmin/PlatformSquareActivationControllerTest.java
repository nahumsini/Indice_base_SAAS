package com.indice.erp.platformadmin;

import static org.mockito.Mockito.*;
import com.indice.erp.auth.*;
import com.indice.erp.pos.square.*;
import jakarta.servlet.http.HttpSession;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class PlatformSquareActivationControllerTest {
    @Test void mutationAuthenticatesAndRequiresCsrfBeforeService() {
        var auth=mock(SessionAuthService.class); var csrf=mock(SessionCsrfService.class);
        var service=mock(SquareCompanyActivationService.class); var session=mock(HttpSession.class);
        when(auth.currentActor(session)).thenReturn(Optional.of(new AuthSessionUser(9L,1L,"Root","root")));
        var request=new SquareActivationDtos.Change("ACTIVE","approved pilot",3L);
        new PlatformSquareActivationController(auth,csrf,service).change(session,42,"csrf",request);
        var order=inOrder(auth,csrf,service); order.verify(auth).currentActor(session);
        order.verify(csrf).requireCsrf(session,"csrf"); order.verify(service).change(9,42,request);
    }
}
