package com.indice.erp.processTasks.processes;

public class DuplicateProcessReferenceException extends IllegalArgumentException {

    private final int matchingRuns;

    public DuplicateProcessReferenceException(int matchingRuns) {
        super("Another run of this process already uses the same reference.");
        this.matchingRuns = matchingRuns;
    }

    public int matchingRuns() {
        return matchingRuns;
    }
}
