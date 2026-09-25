package com.indice.erp.ai.reference;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.PageRequest;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.processTasks.tasks.ProcessTaskAssistantService;
import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentOption;
import java.time.Clock;
import java.util.List;
import org.junit.jupiter.api.Test;

class AiTaskAssigneeReferenceServiceTest {
    final AiToolAuthorizationService auth = mock(AiToolAuthorizationService.class);
    final ProcessTaskAssistantService owner = mock(ProcessTaskAssistantService.class);
    final AuthSessionUser user = new AuthSessionUser(3L, 23L, 41L, "Test", "user");
    final AiTaskAssigneeReferenceService service = new AiTaskAssigneeReferenceService(auth, owner, Clock.systemUTC());
    @Test void nameSearchPreservesAmbiguityAndPagesOnlyAuthorizedMemberships() {
        when(auth.canCreateTask(user)).thenReturn(true);
        when(owner.assignees(23, 3)).thenReturn(List.of(
            new ProcessTaskAssignmentOption(41, 3, "Gibrán Uno", 4L, "Unit", 5L, "Branch A"),
            new ProcessTaskAssignmentOption(42, 4, "Gibran Dos", 4L, "Unit", 6L, "Branch B"),
            new ProcessTaskAssignmentOption(43, 5, "Otra persona", 4L, "Unit", 5L, "Branch A")));
        var first = service.search(user, new PageRequest("gibran", 1, null));
        assertThat(first.totalCount()).isEqualTo(2);
        assertThat(first.hasMore()).isTrue();
        assertThat(first.items()).singleElement().satisfies(item -> assertThat(item.userCompanyId()).isEqualTo(41));
        var next = service.search(user, new PageRequest("GIBRÁN", 1, first.nextCursor()));
        assertThat(next.items()).singleElement().satisfies(item -> assertThat(item.userCompanyId()).isEqualTo(42));
        assertThat(next.hasMore()).isFalse();
    }
    @Test void unauthorizedResolverNeverQueriesPeople() {
        assertThatThrownBy(() -> service.search(user, null)).isInstanceOf(SecurityException.class);
        verifyNoInteractions(owner);
    }
}
