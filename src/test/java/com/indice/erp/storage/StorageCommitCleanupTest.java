package com.indice.erp.storage;
import static org.assertj.core.api.Assertions.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.*;
class StorageCommitCleanupTest {
    @Test void replacementCleanupWaitsForCommitAndNeverDeletesOnRollback() {
        var deleted=new AtomicInteger();TransactionSynchronizationManager.initSynchronization();
        try {
            StorageCommitCleanup.afterCommit(deleted::incrementAndGet);assertThat(deleted.get()).isZero();
            var callbacks=TransactionSynchronizationManager.getSynchronizations();callbacks.forEach(c->c.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));assertThat(deleted.get()).isZero();
            callbacks.forEach(TransactionSynchronization::afterCommit);assertThat(deleted.get()).isEqualTo(1);
        } finally{TransactionSynchronizationManager.clearSynchronization();}
    }
}
