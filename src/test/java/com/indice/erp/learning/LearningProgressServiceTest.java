package com.indice.erp.learning;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.ai.learning.AiLearningContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import static com.indice.erp.learning.LearningProgressContracts.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;

class LearningProgressServiceTest {
    final AuthSessionUser actor=new AuthSessionUser(11L,22L,33L,"Synthetic learner","user");
    final LearningCatalogService catalog=mock(LearningCatalogService.class);
    final LearningProgressRepository repository=mock(LearningProgressRepository.class);
    final AiActionRepository actions=mock(AiActionRepository.class);
    final LearningProgressService service=new LearningProgressService(catalog,repository,actions);
    final Instant time=Instant.parse("2026-10-06T12:00:00Z");

    @BeforeEach void setup() {
        when(catalog.version()).thenReturn("reviewed");
        when(catalog.available(actor,"es-MX")).thenReturn(List.of(chapter("processes","calendar",2,true,"create_task"),chapter("processes","projects",2,true,"create_project"),chapter("pos","sale",4,false,"create_pos_sale")));
        when(repository.understandings(22,11)).thenReturn(List.of());
        when(repository.applications(22,11)).thenReturn(Map.of());
        when(actions.completedLearningOperations(22,11)).thenReturn(Map.of());
    }
    @Test void readProjectsOnlyCurrentVersionAndCompatibleSuccessfulOperations() {
        when(repository.understandings(22,11)).thenReturn(List.of(new LearningProgressRepository.Understanding("processes.calendar",1,time)));
        when(actions.completedLearningOperations(22,11)).thenReturn(Map.of("create_project",time,"preview_create_task",time,"create_pos_terminal_payment",time));
        var progress=service.get(actor,"es-MX");
        assertThat(progress.chapters().getFirst().status()).isEqualTo("pending");
        assertThat(progress.chapters().get(1).status()).isEqualTo("applied");
        assertThat(progress.chapters().get(2).status()).isEqualTo("pending");
        assertThat(progress.stages()).hasSize(6);
        assertThat(progress.stages().get(2).total()).isEqualTo(2);
        assertThat(progress.stages().get(4).total()).isZero();
        verify(repository).understandings(22,11);verify(actions).completedLearningOperations(22,11);
    }
    @Test void resumeStartsAtSelectedMissionAndWrapsPendingEarlierChapters() {
        when(repository.current(22,11)).thenReturn("processes.projects");
        assertThat(service.get(actor,"es-MX").nextMission().chapterId()).isEqualTo("processes.projects");
        when(repository.applications(22,11)).thenReturn(Map.of("processes.projects",time));
        assertThat(service.get(actor,"es-MX").nextMission().chapterId()).isEqualTo("processes.calendar");
    }
    @Test void declaredUnderstandingDoesNotCreateApplicationEvidence() {
        service.update(actor,new Change("processes.calendar",2,"understood"),"es-MX");
        verify(catalog).require(actor,"processes.calendar",2);
        verify(repository).understand(22,11,"processes.calendar",2);
        verify(repository,never()).apply(anyLong(),anyLong(),anyString(),anyString());
    }
    @Test void cannotDeclareAppliedOrUseRevokedAndStaleChapters() {
        for(String operation:Arrays.asList("applied",null))assertThatThrownBy(()->service.update(actor,new Change("processes.calendar",2,operation),"es-MX")).isInstanceOf(IllegalArgumentException.class);
        when(catalog.require(actor,"private",2)).thenThrow(new SecurityException());
        assertThatThrownBy(()->service.update(actor,new Change("private",2,"understood"),"es-MX")).isInstanceOf(SecurityException.class);
        when(catalog.require(actor,"processes.calendar",1)).thenThrow(new IllegalArgumentException());
        assertThatThrownBy(()->service.update(actor,new Change("processes.calendar",1,"understood"),"es-MX")).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(repository);
    }
    private static LearningCatalogService.Chapter chapter(String module,String tab,int stage,boolean journey,String tool) {
        var content=new TabContent(tab,tab,tab,"Prepare","Verify",List.of(new Step("prepare","Before","Requirements")),module+"."+tab,2,journey,true,List.of(tool));
        return new LearningCatalogService.Chapter(new ModuleContent(module,module,"es-MX",module,stage,List.of(content)),content);
    }
}
