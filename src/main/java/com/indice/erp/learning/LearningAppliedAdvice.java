package com.indice.erp.learning;
import com.indice.erp.auth.SessionAuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.MethodParameter;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.*;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@ControllerAdvice
public class LearningAppliedAdvice implements ResponseBodyAdvice<Object> {
    private static final Logger LOG=LoggerFactory.getLogger(LearningAppliedAdvice.class);
    private final SessionAuthService sessions;
    private final LearningProgressRepository repository;
    private final LearningCatalogService catalog;
    public LearningAppliedAdvice(SessionAuthService sessions,LearningProgressRepository repository,LearningCatalogService catalog) {
        this.sessions=sessions;this.repository=repository;this.catalog=catalog;
    }
    public boolean supports(MethodParameter method,Class<? extends HttpMessageConverter<?>> converter) { return method.hasMethodAnnotation(LearningApplied.class); }
    public Object beforeBodyWrite(Object body,MethodParameter method,MediaType type,Class<? extends HttpMessageConverter<?>> converter,ServerHttpRequest request,ServerHttpResponse response) {
        if(!(request instanceof ServletServerHttpRequest input)||!(response instanceof ServletServerHttpResponse output)
            ||body==null||output.getServletResponse().getStatus()<200||output.getServletResponse().getStatus()>=300) return body;
        // A learning projection failure must not turn an already committed business operation into a failed response.
        try {
            var actor=sessions.currentUser(input.getServletRequest().getSession(false));
            var bound=input.getServletRequest().getAttribute(LearningOperationContext.ATTRIBUTE);
            if(actor.isPresent()&&bound instanceof LearningOperationContext.Actor owner
                &&owner.companyId()==actor.get().companyId()&&owner.userId()==actor.get().userId()) {
                var contract=method.getMethodAnnotation(LearningApplied.class);
                var chapter=contract.value();
                if(!contract.pathVariable().isBlank()) {
                    var variables=input.getServletRequest().getAttribute(org.springframework.web.servlet.HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
                    if(!(variables instanceof java.util.Map<?,?> values))return body;
                    var selected=values.get(contract.pathVariable());
                    chapter=java.util.Arrays.stream(contract.chaptersByValue()).map(branch->branch.split("=",2))
                        .filter(branch->branch.length==2&&branch[0].equals(selected)).map(branch->branch[1]).findFirst().orElse("");
                }
                final var ownedChapter=chapter;
                if(catalog.canAccess(actor.get(),ownedChapter))
                    repository.apply(actor.get().companyId(),actor.get().userId(),ownedChapter,method.getMethod().getName());
            }
        } catch(RuntimeException exception) { LOG.warn("Learning completion projection could not be saved; business response remains successful."); }
        return body;
    }
}
