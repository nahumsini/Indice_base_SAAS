package com.indice.erp.storage;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Destructive storage cleanup happens only after durable owner metadata commits. */
public final class StorageCommitCleanup {
    private StorageCommitCleanup() { }
    public static void afterCommit(Runnable cleanup) {
        if(!TransactionSynchronizationManager.isSynchronizationActive()) { cleanup.run(); return; }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { cleanup.run(); }
        });
    }
}
