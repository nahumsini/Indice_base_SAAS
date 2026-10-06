package com.indice.erp.pos.square;
import com.indice.erp.pos.*;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.terminal.PendingTerminalPayments;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(properties={"app.email.enabled=false","app.entitlements.projection-enabled=false"})
class TerminalPreviewReadOnlyIntegrationTest {
    @Autowired JdbcTemplate jdbc;@Autowired PlatformTransactionManager manager;
    @Autowired PendingTerminalPayments pending;@Autowired ShiftRepository shifts;
    @Autowired SquareRefundOutstanding refunds;
    @Test void terminalAndRefundInspectionWorksInMysqlReadonlyTransactions(){
        assertThat(jdbc.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        var context=new PosContext(-1L,-1L,"Synthetic","admin",true,PosScope.businessOffice(-1L,-1L));
        var now=Instant.now();var intent=new SquareRecords.PaymentIntent(-1,-1,-1,-1,-1,"synthetic","synthetic","synthetic","synthetic","synthetic",SquareTerminalPaymentStatus.APPROVED,new BigDecimal("10.50"),"CAD","synthetic","{}",null,-1L,-1,"admin","BUSINESS_OFFICE",-1L,-1L,now,now,now.plusSeconds(600));
        var tx=new TransactionTemplate(manager);tx.setReadOnly(true);
        tx.execute(status->{assertThat(pending.read(context,-1)).isEmpty();assertThat(shifts.readOpenByUserAndRegister(context,-1)).isEmpty();
            assertThatCode(()->refunds.inspectNone(intent)).doesNotThrowAnyException();assertThat(status.isRollbackOnly()).isFalse();return null;});
    }
}
