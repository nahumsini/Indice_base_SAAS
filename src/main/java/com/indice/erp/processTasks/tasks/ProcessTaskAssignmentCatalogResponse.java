package com.indice.erp.processTasks.tasks;

import java.util.List;

public record ProcessTaskAssignmentCatalogResponse(
    List<ProcessTaskAssignmentOption> items,
    int count
) {
    public ProcessTaskAssignmentCatalogResponse(List<ProcessTaskAssignmentOption> items) {
        this(List.copyOf(items), items.size());
    }
}
