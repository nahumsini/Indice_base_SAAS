package com.indice.erp.learning;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.ai.learning.AiLearningContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessService;
import java.io.IOException;
import java.util.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class LearningCatalogService {
    private final Catalog catalog;
    private final AiToolAuthorizationService authorization;
    private final HrAccessService hr;
    public LearningCatalogService(ObjectMapper mapper, AiToolAuthorizationService authorization, HrAccessService hr) throws IOException {
        this.authorization=authorization; this.hr=hr;
        try(var input=new ClassPathResource("ai/learning-catalog-v1.json").getInputStream()) { catalog=mapper.readValue(input,Catalog.class); }
    }
    public String version() { return catalog.version(); }
    public List<Chapter> available(AuthSessionUser user,String locale) {
        if(locale==null||!Set.of("es-MX","en-CA").contains(locale)) throw new IllegalArgumentException("Unsupported learning locale.");
        return authorization.withCapabilityEvaluation(()->catalog.modules().stream().filter(m->m.locale().equals(locale)).flatMap(m->m.tabs().stream()
            .filter(t->allowed(user,m,t))
            .map(t->new Chapter(m,t))).toList());
    }
    public Chapter require(AuthSessionUser user,String id,int version) {
        var chapter=find(id).filter(c->allowed(user,c.module(),c.tab()))
            .orElseThrow(()->new SecurityException("An authorized learning chapter is required."));
        if(chapter.tab().version()!=version) throw new IllegalArgumentException("Learning content changed; review the current chapter.");
        return chapter;
    }
    public boolean canAccess(AuthSessionUser user,String id) {
        return find(id).map(c->allowed(user,c.module(),c.tab())).orElse(false);
    }
    private Optional<Chapter> find(String id) {
        return catalog.modules().stream().filter(m->m.locale().equals("es-MX"))
            .flatMap(m->m.tabs().stream().filter(t->t.chapterId().equals(id)).map(t->new Chapter(m,t))).findFirst();
    }
    private boolean allowed(AuthSessionUser user,ModuleContent module,TabContent tab) {
        return authorization.canReadGuideTab(user,module.module(),tab.tab())
            &&(!module.module().equals("human_resources")||hr.canAccessReadableTab(user,HrAccessService.HrTab.valueOf(tab.tab().toUpperCase(Locale.ROOT))));
    }
    public record Chapter(ModuleContent module,TabContent tab) { }
}
