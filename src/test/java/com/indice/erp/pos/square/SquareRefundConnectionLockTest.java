package com.indice.erp.pos.square;

import com.indice.erp.pos.*;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SquareRefundConnectionLockTest {
    @Test void revalidatesConnectedMerchantWhileConnectionRowIsLocked() {
        var guard=mock(SquareConnectionChangeGuard.class); var connections=mock(SquareConnectionRepository.class);
        var properties=new SquareTerminalProperties(); var context=new PosContext(11L,7L,"Owner","admin",true,PosScope.corporateOffice());
        var current=new SquareRecords.Connection(2L,7L,"merchant-1","token",null,Instant.now(),0L);
        when(guard.lock(7L,"sandbox")).thenReturn("merchant-1");
        when(connections.findConnection(context,"sandbox")).thenReturn(java.util.Optional.of(current));
        assertThat(new SquareRefundConnectionLock(guard,connections,properties).lock(context).merchantId())
            .isEqualTo("merchant-1");
        var order=inOrder(guard,connections); order.verify(guard).lock(7L,"sandbox");
        order.verify(connections).findConnection(context,"sandbox");
    }
}
