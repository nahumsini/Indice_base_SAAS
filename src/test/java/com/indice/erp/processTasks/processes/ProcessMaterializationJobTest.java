package com.indice.erp.processTasks.processes;

import java.util.List;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.doThrow;

@ExtendWith(MockitoExtension.class)
class ProcessMaterializationJobTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private ScheduledProcessMaterializer materializer;

    private ProcessMaterializationJob job;

    @BeforeEach
    void setUp() {
        job = new ProcessMaterializationJob(jdbcTemplate, materializer, 100);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void oneInvalidProcessDoesNotBlockTheRemainingCandidates() {
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any())).willReturn(List.of(
            new ProcessMaterializationJob.ProcessMaterializationCandidate(20L, 142L),
            new ProcessMaterializationJob.ProcessMaterializationCandidate(21L, 143L)
        ));
        doThrow(new NoSuchElementException("Assigned user not found."))
            .when(materializer).materialize(20L, 142L);

        job.materializeDueProcesses();

        then(materializer).should().materialize(20L, 142L);
        then(materializer).should().materialize(21L, 143L);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void unexpectedFailureAlsoLeavesLaterCandidatesRunnable() {
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any())).willReturn(List.of(
            new ProcessMaterializationJob.ProcessMaterializationCandidate(20L, 142L),
            new ProcessMaterializationJob.ProcessMaterializationCandidate(21L, 143L)
        ));
        doThrow(new IllegalStateException("database conflict"))
            .when(materializer).materialize(20L, 142L);

        job.materializeDueProcesses();

        then(materializer).should().materialize(20L, 142L);
        then(materializer).should().materialize(21L, 143L);
    }
}
