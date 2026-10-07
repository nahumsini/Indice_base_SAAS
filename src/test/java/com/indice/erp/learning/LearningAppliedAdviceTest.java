package com.indice.erp.learning;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.indice.erp.auth.*;
import com.indice.erp.ai.learning.AiLearningContracts.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.http.server.*;
import org.springframework.mock.web.*;

class LearningAppliedAdviceTest {
    static class Owner {
        @LearningApplied("processes.calendar") public Object save(){return Map.of("id",1);}
        @LearningApplied(pathVariable="collection",chaptersByValue={"products=inventory.products"}) public Object collection(){return Map.of("id",1);}
        public Object preview(){return Map.of("preview",true);}
    }
    @Test void onlyAuthorizedSuccessfulOwnerMutationsRecordEvidence() throws Exception {
        var sessions=mock(SessionAuthService.class);var repository=mock(LearningProgressRepository.class);var catalog=mock(LearningCatalogService.class);
        var advice=new LearningAppliedAdvice(sessions,repository,catalog);
        var request=new MockHttpServletRequest();var session=new MockHttpSession();request.setSession(session);
        var response=new MockHttpServletResponse();var actor=new AuthSessionUser(11L,22L,33L,"Synthetic","user");
        request.setAttribute(LearningOperationContext.ATTRIBUTE,new LearningOperationContext.Actor(22,11));
        when(sessions.currentUser(session)).thenReturn(Optional.of(actor));
        var tab=new TabContent("calendar","Tasks","Tasks","prepare","verify",List.of(),"processes.calendar",2,true,true,List.of("create_task"));
        when(catalog.canAccess(actor,"processes.calendar")).thenReturn(true);
        var save=new MethodParameter(Owner.class.getMethod("save"),-1);
        assertThat(advice.supports(new MethodParameter(Owner.class.getMethod("preview"),-1),MappingJackson2HttpMessageConverter.class)).isFalse();
        response.setStatus(403);write(advice,save,request,response);verifyNoInteractions(repository);
        response.setStatus(201);write(advice,save,request,response);verify(repository).apply(22,11,"processes.calendar","save");
        request.setAttribute(LearningOperationContext.ATTRIBUTE,new LearningOperationContext.Actor(999,11));
        write(advice,save,request,response);verifyNoMoreInteractions(repository);
        when(catalog.canAccess(actor,"processes.calendar")).thenReturn(false);write(advice,save,request,response);verifyNoMoreInteractions(repository);
        request.setAttribute(org.springframework.web.servlet.HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE,Map.of("collection","unadopted"));
        write(advice,new MethodParameter(Owner.class.getMethod("collection"),-1),request,response);verifyNoMoreInteractions(repository);
    }
    @Test void learningProjectionFailureDoesNotFailTheCommittedBusinessResponse() throws Exception {
        var sessions=mock(SessionAuthService.class);when(sessions.currentUser(any())).thenThrow(new IllegalStateException());
        var advice=new LearningAppliedAdvice(sessions,mock(LearningProgressRepository.class),mock(LearningCatalogService.class));
        var request=new MockHttpServletRequest();var response=new MockHttpServletResponse();var body=Map.of("id",1);
        assertThat(advice.beforeBodyWrite(body,new MethodParameter(Owner.class.getMethod("save"),-1),MediaType.APPLICATION_JSON,MappingJackson2HttpMessageConverter.class,new ServletServerHttpRequest(request),new ServletServerHttpResponse(response))).isSameAs(body);
    }
    @Test void bindingUsesOnlyTheServerActorOfTheOwnerRequest() {
        var request=new MockHttpServletRequest();
        org.springframework.web.context.request.RequestContextHolder.setRequestAttributes(new org.springframework.web.context.request.ServletRequestAttributes(request));
        try {
            LearningOperationContext.capture(new AuthSessionUser(11L,22L,33L,"Synthetic","user"));
            assertThat(request.getAttribute(LearningOperationContext.ATTRIBUTE)).isEqualTo(new LearningOperationContext.Actor(22,11));
        } finally {org.springframework.web.context.request.RequestContextHolder.resetRequestAttributes();}
    }
    @Test void collectionEvidenceRequiresAnExplicitOwnerBranchAndCurrentAccess() throws Exception {
        var sessions=mock(SessionAuthService.class);var repository=mock(LearningProgressRepository.class);var catalog=mock(LearningCatalogService.class);
        var advice=new LearningAppliedAdvice(sessions,repository,catalog);
        var request=new MockHttpServletRequest();var session=new MockHttpSession();request.setSession(session);
        var response=new MockHttpServletResponse();var actor=new AuthSessionUser(11L,22L,33L,"Synthetic","user");
        request.setAttribute(LearningOperationContext.ATTRIBUTE,new LearningOperationContext.Actor(22,11));
        when(sessions.currentUser(session)).thenReturn(Optional.of(actor));when(catalog.canAccess(actor,"inventory.products")).thenReturn(true);
        var method=new MethodParameter(Owner.class.getMethod("collection"),-1);
        request.setAttribute(org.springframework.web.servlet.HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE,Map.of("collection","unadopted"));
        write(advice,method,request,response);verifyNoInteractions(repository);
        request.setAttribute(org.springframework.web.servlet.HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE,Map.of("collection","products"));
        write(advice,method,request,response);verify(repository).apply(22,11,"inventory.products","collection");
        when(catalog.canAccess(actor,"inventory.products")).thenReturn(false);write(advice,method,request,response);verifyNoMoreInteractions(repository);
    }
    private void write(LearningAppliedAdvice advice,MethodParameter method,MockHttpServletRequest input,MockHttpServletResponse output) {
        advice.beforeBodyWrite(Map.of("id",1),method,MediaType.APPLICATION_JSON,MappingJackson2HttpMessageConverter.class,new ServletServerHttpRequest(input),new ServletServerHttpResponse(output));
    }
}
