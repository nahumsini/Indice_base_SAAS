package com.indice.erp.pos.square;

import java.time.Instant;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.*;

class SquareFirstConnectionRaceIntegrationTest extends SquareRegisterDatabaseFixture {
    @Autowired SquareConnectionChangeGuard guard;
    @Autowired SquareConnectionCredentialWriter writer;
    @Autowired PlatformTransactionManager transactions;
    @Test void concurrentDifferentMerchantConnectObservesTheFirstCommit() throws Exception {
        TestTransaction.flagForCommit(); TestTransaction.end();
        var suffix=java.util.UUID.randomUUID().toString();
        var state=new SquareConnectionRepository.OAuthState(1,company,actor,"sandbox");
        var first=new SquareRecords.Connection(0,company,"merchant-first-"+suffix,"a","r",
            Instant.now().plusSeconds(300),0);
        var second=new SquareRecords.Connection(0,company,"merchant-second-"+suffix,"b","s",
            Instant.now().plusSeconds(300),0);
        var inserted=new CountDownLatch(1); var release=new CountDownLatch(1);
        var executor=Executors.newFixedThreadPool(2); var tx=new TransactionTemplate(transactions);
        try {
            var firstWork=executor.submit(() -> tx.executeWithoutResult(ignored -> {
                assertThat(guard.lock(company,"sandbox")).isNull(); writer.save(state,first,false);
                inserted.countDown(); await(release);
            }));
            assertThat(inserted.await(5,TimeUnit.SECONDS)).isTrue();
            var secondWork=executor.submit(() -> tx.execute(ignored -> {
                var existing=guard.lock(company,"sandbox");
                guard.requireReplacementAllowed(company,existing,second.merchantId());
                writer.save(state,second,true); return existing;
            }));
            assertThatThrownBy(() -> secondWork.get(200,TimeUnit.MILLISECONDS))
                .isInstanceOf(TimeoutException.class);
            release.countDown(); firstWork.get(5,TimeUnit.SECONDS);
            assertThat(secondWork.get(5,TimeUnit.SECONDS)).isEqualTo(first.merchantId());
        } finally { release.countDown(); executor.shutdownNow(); }
    }
    private static void await(CountDownLatch latch) {
        try { latch.await(); } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt(); throw new IllegalStateException(interrupted);
        }
    }
}
