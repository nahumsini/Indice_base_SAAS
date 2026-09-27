package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.platformadmin.*;
import java.time.*;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class SquareCompanyActivationServiceTest {
    @Test void activationUsesExpectedVersionAndEligibleMerchant() {
        var access=mock(PlatformAdminAccessService.class); var audit=mock(PlatformAuditService.class);
        var store=mock(SquareActivationStore.class); var properties=new SquareTerminalProperties();
        var activation=new SquareActivationProperties(); properties.setEnvironment("production");
        activation.setLiveActivationApproved(true);
        var policy=new SquareLiveActivationPolicy(properties,activation,store); var now=Instant.parse("2026-09-22T12:00:00Z");
        var current=new SquareActivationStore.Record(42,"production","CONNECTED","merchant","DISABLED",
            null,null,null,null,3,true);
        var updated=new SquareActivationStore.Record(42,"production","CONNECTED","merchant","ACTIVE",
            now,now,null,"approved pilot",4,true);
        when(access.require(9,"PLATFORM_ACCOUNTS_WRITE")).thenReturn(
            new PlatformAdminAccessService.Access(1,"PLATFORM_ROOT",List.of()));
        when(store.find(42,"production")).thenReturn(Optional.of(current));
        when(store.change(current,SquareActivationState.ACTIVE,9,"approved pilot",3,now)).thenReturn(updated);
        var service=new SquareCompanyActivationService(access,audit,store,policy,Clock.fixed(now,ZoneOffset.UTC));
        var result=service.change(9,42,new SquareActivationDtos.Change("ACTIVE","approved pilot",3L));
        assertThat(result.liveChargeAllowed()).isTrue(); assertThat(result.version()).isEqualTo(4);
        verify(store).change(current,SquareActivationState.ACTIVE,9,"approved pilot",3,now);
        verify(audit).record(eq(9L),eq("SQUARE_LIVE_ACTIVATION_CHANGED"),eq("COMPANY"),eq("42"),eq(42L),eq("SUCCESS"),
            eq(java.util.Map.of("previousState","DISABLED","state","ACTIVE","environment","production",
                "reason","approved pilot","previousVersion",3L,"version",4L,"replay",false)));
    }
}
