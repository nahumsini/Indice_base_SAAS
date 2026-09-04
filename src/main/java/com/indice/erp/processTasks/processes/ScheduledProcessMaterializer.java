package com.indice.erp.processTasks.processes;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Gives every scheduled process its own commit/rollback boundary. */
@Service
public class ScheduledProcessMaterializer {

    private final ProcessesService processesService;

    public ScheduledProcessMaterializer(ProcessesService processesService) {
        this.processesService = processesService;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void materialize(long companyId, long processId) {
        processesService.materializeProcess(companyId, processId);
    }
}
