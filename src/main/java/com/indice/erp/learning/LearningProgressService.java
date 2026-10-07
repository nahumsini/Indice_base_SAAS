package com.indice.erp.learning;
import static com.indice.erp.learning.LearningProgressContracts.*;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.auth.AuthSessionUser;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningProgressService {
    private final LearningCatalogService catalog;
    private final LearningProgressRepository repository;
    private final AiActionRepository actions;
    public LearningProgressService(LearningCatalogService catalog,LearningProgressRepository repository,AiActionRepository actions) {
        this.catalog=catalog;this.repository=repository;this.actions=actions;
    }
    public Snapshot get(AuthSessionUser actor,String locale) {
        var available=catalog.available(actor,locale);
        if(available.isEmpty()) throw new SecurityException("An authorized learning module is required.");
        var understood=repository.understandings(actor.companyId(),actor.userId());
        var applied=repository.applications(actor.companyId(),actor.userId());
        var commits=actions.completedLearningOperations(actor.companyId(),actor.userId());
        var chapters=available.stream().map(c->{
            var t=c.tab();
            var u=understood.stream().filter(v->v.chapterId().equals(t.chapterId())&&v.version()==t.version()).map(LearningProgressRepository.Understanding::at).findFirst().orElse(null);
            var a=java.util.stream.Stream.concat(java.util.stream.Stream.ofNullable(applied.get(t.chapterId())),t.evidenceTools().stream().map(commits::get).filter(Objects::nonNull)).max(Instant::compareTo).orElse(null);
            return new ChapterProgress(t.chapterId(),t.version(),c.module().stage(),c.module().module(),t.tab(),c.module().pageId(),t.label(),a!=null?"applied":u!=null?"understood":"pending",u,a,t.journey(),t.companion(),t.steps());
        }).toList();
        var selected=repository.current(actor.companyId(),actor.userId());
        int position=-1;
        for(int i=0;i<chapters.size();i++)if(chapters.get(i).chapterId().equals(selected)){position=i;break;}
        var next=chapters.subList(Math.max(0,position),chapters.size()).stream().filter(c->c.journey()&&c.status().equals("pending")).findFirst()
            .orElseGet(()->chapters.stream().filter(c->c.journey()&&c.status().equals("pending")).findFirst().orElse(null));
        var current=chapters.stream().filter(c->c.chapterId().equals(selected)).map(ChapterProgress::chapterId).findFirst().orElse(next==null?null:next.chapterId());
        var stages=new ArrayList<StageProgress>();
        for(int stage=0;stage<6;stage++) {
            final int index=stage;
            var items=chapters.stream().filter(c->c.stage()==index&&c.journey()).toList();
            stages.add(new StageProgress(index,items.size(),(int)items.stream().filter(c->c.status().equals("understood")).count(),(int)items.stream().filter(c->c.status().equals("applied")).count()));
        }
        return new Snapshot(catalog.version(),current,List.copyOf(stages),chapters,next);
    }
    public void validate(AuthSessionUser actor,Change change) {
        if(change==null||change.chapterId()==null||change.operation()==null||!Set.of("start","understood").contains(change.operation())) throw new IllegalArgumentException("Choose start or understood and a current chapter.");
        if(!Set.of("es-MX","en-CA").contains(change.learningLocale())) throw new IllegalArgumentException("Unsupported learning locale.");
        catalog.require(actor,change.chapterId(),change.version());
    }
    @Transactional
    public Snapshot update(AuthSessionUser actor,Change change,String locale) {
        validate(actor,change);
        repository.select(actor.companyId(),actor.userId(),change.chapterId());
        if(change.operation().equals("understood")) repository.understand(actor.companyId(),actor.userId(),change.chapterId(),change.version());
        return get(actor,locale);
    }
}
