package com.indice.erp.learning;

import com.indice.erp.auth.AuthSessionUser;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** An opt-in owner binds the actor it actually used; request data never supplies this proof. */
public final class LearningOperationContext {
    public static final String ATTRIBUTE=LearningOperationContext.class.getName()+".actor";
    private LearningOperationContext() { }
    public static void capture(AuthSessionUser actor) {
        if(actor!=null)capture(actor.companyId(),actor.userId());
    }
    public static void capture(long companyId,long userId) {
        if(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)
            attributes.getRequest().setAttribute(ATTRIBUTE,new Actor(companyId,userId));
    }
    public record Actor(long companyId,long userId) { }
}
