package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.util.List;
import org.junit.jupiter.api.Test;

class SquareSetupServiceTest {
    @Test void locationListingDelegatesToScopedLocationOwner() {
        var locations=mock(SquareLocationSetup.class);
        var expected=List.of(new SquareTerminalDtos.SquareLocation("loc-1","Main","CAD","CA"));
        var context=new PosContext(11L,7L,"Admin","admin",true,PosScope.corporateOffice());
        when(locations.list(context)).thenReturn(expected);
        var service=new SquareSetupService(null,mock(SquareOAuthSetup.class),locations,
            mock(SquareTerminalPairing.class),mock(SquareRegisterTerminalBinding.class),mock(SquareTerminalLifecycle.class));
        assertThat(service.squareLocations(context)).isSameAs(expected);
        verify(locations).list(context);
    }
}
