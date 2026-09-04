package com.indice.erp.processTasks.processes;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;

class ScheduledProcessMaterializerTest {

    @Test
    void delegatesToTheProcessService() {
        var processesService = mock(ProcessesService.class);
        var materializer = new ScheduledProcessMaterializer(processesService);

        materializer.materialize(20L, 142L);

        then(processesService).should().materializeProcess(20L, 142L);
    }

    @Test
    void eachCandidateUsesAnIndependentTransaction() throws Exception {
        var annotation = ScheduledProcessMaterializer.class
            .getMethod("materialize", long.class, long.class)
            .getAnnotation(Transactional.class);

        assertThat(annotation).isNotNull();
        assertThat(annotation.propagation()).isEqualTo(Propagation.REQUIRES_NEW);
    }
}
