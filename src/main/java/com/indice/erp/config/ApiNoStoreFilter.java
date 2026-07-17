package com.indice.erp.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 21)
public class ApiNoStoreFilter extends OncePerRequestFilter {

    static final String CACHE_CONTROL_VALUE =
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        response.setHeader("Cache-Control", CACHE_CONTROL_VALUE);
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Expires", "0");
        filterChain.doFilter(request, response);
    }
}
