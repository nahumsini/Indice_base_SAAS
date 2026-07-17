package com.indice.erp.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ApiNoStoreFilterTest {

    private final ApiNoStoreFilter filter = new ApiNoStoreFilter();

    @Test
    void apiResponsesCannotBeReusedAfterMutations() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/v1/hr/users");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader("Cache-Control"))
            .isEqualTo(ApiNoStoreFilter.CACHE_CONTROL_VALUE);
        assertThat(response.getHeader("Pragma")).isEqualTo("no-cache");
        assertThat(response.getHeader("Expires")).isEqualTo("0");
    }

    @Test
    void nonApiResponsesAreLeftUntouched() throws Exception {
        var request = new MockHttpServletRequest("GET", "/index.html");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader("Cache-Control")).isNull();
    }
}
