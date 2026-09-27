package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import java.time.Instant;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.*;

class SquareMerchantCollisionIntegrationTest extends SquareRegisterDatabaseFixture {
    @Autowired SquareConnectionCredentialWriter writer;
    @Autowired PlatformTransactionManager transactions;
    @Test void concurrentCompaniesCannotOverwriteTheWinningMerchantCredentials() throws Exception {
        var key=java.util.UUID.randomUUID().toString(); var name="Second Square race "+key;
        jdbc.update("INSERT INTO companies(name) VALUES (?)",name);
        var other=jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,name);
        TestTransaction.flagForCommit(); TestTransaction.end();
        var start=new CountDownLatch(1); var executor=Executors.newFixedThreadPool(2);
        var tx=new TransactionTemplate(transactions);
        try {
            var first=executor.submit(() -> connect(tx,start,company,"token-first",key));
            var second=executor.submit(() -> connect(tx,start,other,"token-second",key));
            start.countDown(); var outcomes=java.util.List.of(first.get(),second.get());
            assertThat(outcomes).containsExactlyInAnyOrder("saved","conflict");
            var rows=jdbc.queryForList("SELECT company_id,access_token_protected FROM pos_square_connections "
                + "WHERE environment='sandbox' AND merchant_id=?","shared-merchant-"+key);
            assertThat(rows).singleElement().satisfies(row -> {
                var owner=((Number)row.get("company_id")).longValue();
                assertThat(row.get("access_token_protected")).isEqualTo(
                    owner==company?"token-first":"token-second");
            });
        } finally { executor.shutdownNow(); }
    }
    private String connect(TransactionTemplate tx, CountDownLatch start, long owner, String token, String key) {
        try { start.await(); return tx.execute(ignored -> {
            var state=new SquareConnectionRepository.OAuthState(1,owner,actor,"sandbox");
            writer.save(state,new SquareRecords.Connection(0,owner,"shared-merchant-"+key,token,"refresh",
                Instant.now().plusSeconds(300),0),false); return "saved";
        }); } catch (PosApiException conflict) { return "conflict"; }
        catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); return "interrupted"; }
    }
}
