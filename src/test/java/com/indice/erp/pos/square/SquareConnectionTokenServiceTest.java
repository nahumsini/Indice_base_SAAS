package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class SquareConnectionTokenServiceTest {
    @Test void unauthorizedCallRefreshesOnceAndRetriesWithNewToken() {
        var refresh=mock(SquareConnectionRefreshService.class); var codec=mock(SquareTokenCodec.class);
        var old=connection("old",0); var fresh=connection("new",1);
        when(refresh.fresh(7L,null)).thenReturn(old); when(refresh.refresh(old,null)).thenReturn(fresh);
        when(codec.reveal("old")).thenReturn("old-token"); when(codec.reveal("new")).thenReturn("new-token");
        var calls=new AtomicInteger();
        var result=new SquareConnectionTokenService(refresh,codec).withCompanyToken(7L,token -> {
            if (calls.getAndIncrement()==0) throw new SquareGatewayException("unauthorized",false,401,null);
            return token;
        });
        assertThat(result).isEqualTo("new-token"); verify(refresh).refresh(old,null);
    }
    private SquareRecords.Connection connection(String token,long version) {
        return new SquareRecords.Connection(5,7,"merchant",token,"refresh",Instant.now().plusSeconds(600),version);
    }
}
