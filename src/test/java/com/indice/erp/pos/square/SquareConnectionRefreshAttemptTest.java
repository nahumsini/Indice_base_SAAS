package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
import java.time.*;
import org.junit.jupiter.api.Test;

class SquareConnectionRefreshAttemptTest {
    @Test void transientFailureReleasesLeaseWithoutDisablingConnection() {
        var gateway=mock(SquareTerminalGateway.class); var codec=mock(SquareTokenCodec.class);
        var leases=mock(SquareRefreshLeaseStore.class);
        var value=connection(); when(codec.reveal("refresh")).thenReturn("plain");
        when(gateway.refreshToken("plain")).thenThrow(new SquareGatewayException("timeout",true,null));
        var attempt=new SquareConnectionRefreshAttempt(gateway,codec,leases,Clock.systemUTC());
        assertThatThrownBy(() -> attempt.run(value,11L,"lease")).isInstanceOf(SquareGatewayException.class);
        verify(leases).release(5,"lease"); verify(leases,never()).fail(anyLong(),anyLong(),anyString(),any());
    }
    @Test void merchantIdentityMismatchFailsClosed() {
        var gateway=mock(SquareTerminalGateway.class); var codec=mock(SquareTokenCodec.class);
        var leases=mock(SquareRefreshLeaseStore.class);
        var value=connection(); when(codec.reveal("refresh")).thenReturn("plain");
        when(gateway.refreshToken("plain")).thenReturn(new SquareTerminalGateway.OAuthToken("other","access","refresh",Instant.now()));
        var attempt=new SquareConnectionRefreshAttempt(gateway,codec,leases,Clock.systemUTC());
        assertThatThrownBy(() -> attempt.run(value,11L,"lease")).isInstanceOf(RuntimeException.class);
        verify(leases).fail(5,0,"lease",11L); verify(leases).release(5,"lease");
    }
    @Test void unauthorizedFailureMarksOnlyTheClaimedCredentialVersion() {
        var gateway=mock(SquareTerminalGateway.class); var codec=mock(SquareTokenCodec.class);
        var leases=mock(SquareRefreshLeaseStore.class); var value=connection();
        when(codec.reveal("refresh")).thenReturn("plain");
        when(gateway.refreshToken("plain")).thenThrow(new SquareGatewayException("revoked",false,401,null));
        var attempt=new SquareConnectionRefreshAttempt(gateway,codec,leases,Clock.systemUTC());
        assertThatThrownBy(() -> attempt.run(value,11L,"lease")).isInstanceOf(SquareGatewayException.class);
        verify(leases).fail(5,0,"lease",11L); verify(leases,never()).release(anyLong(),anyString());
    }
    private SquareRecords.Connection connection() {
        return new SquareRecords.Connection(5,7,"merchant","access","refresh",Instant.now().minusSeconds(1),0);
    }
}
