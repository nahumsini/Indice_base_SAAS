package com.indice.erp;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.web.servlet.view.xslt.XsltView;
import org.springframework.web.servlet.view.xslt.XsltViewResolver;

/** Release applicability evidence for CVE-2026-47884; does not claim the library is patched. */
@SpringBootTest
class MvcViewExposureRegressionTest {
    @Autowired
    private ApplicationContext context;

    @Autowired
    private RequestMappingHandlerMapping mappings;

    @Test
    void apiRuntimeDoesNotConfigureXsltRendering() {
        assertThat(context.getBeanNamesForType(XsltView.class)).isEmpty();
        assertThat(context.getBeanNamesForType(XsltViewResolver.class)).isEmpty();
    }

    @Test
    void wildcardControllersCannotResolveImplicitViewNames() {
        mappings.getHandlerMethods().forEach((mapping, handler) -> {
            if (mapping.getPatternValues().stream().anyMatch(path -> path.endsWith("/**"))) {
                boolean responseBody = AnnotatedElementUtils.hasAnnotation(handler.getBeanType(), ResponseBody.class)
                        || AnnotatedElementUtils.hasAnnotation(handler.getMethod(), ResponseBody.class);
                assertThat(responseBody).as("Wildcard handler must not render an implicit MVC view: %s", handler)
                        .isTrue();
            }
        });
    }
}
