package com.indice.erp.ai.reference;

import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.PageRequest;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.ReferencePage;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.processTasks.tasks.ProcessTaskAssistantService;
import java.text.Normalizer;
import java.time.Clock;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class AiTaskAssigneeReferenceService {
    private final AiToolAuthorizationService authorization;
    private final ProcessTaskAssistantService tasks;
    private final Clock clock;

    public AiTaskAssigneeReferenceService(AiToolAuthorizationService authorization, ProcessTaskAssistantService tasks, Clock clock) {
        this.authorization = authorization;
        this.tasks = tasks;
        this.clock = clock;
    }

    public ReferencePage<Assignee> search(AuthSessionUser user, PageRequest request) {
        if (!authorization.canCreateTask(user)) throw new SecurityException("Task permission required.");
        var page = AiReferencePages.normalize(request);
        var query = normalized(page.query());
        var items = tasks.assignees(user.companyId(), user.userId()).stream()
            .filter(person -> normalized(person.name()).contains(query))
            .map(person -> new Assignee(person.userCompanyId(), person.name(), person.unitId(), person.unitName(),
                person.businessId(), person.businessName())).toList();
        return AiReferencePages.all(clock, "TASK_ASSIGNMENT_SCOPE", items, page);
    }

    private static String normalized(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }
    public record Assignee(long userCompanyId, String name, Long unitId, String unitName,
        Long businessId, String businessName) { }
}
