package com.indice.erp.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class RequestCorrelationFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID_HEADER = "X-Request-ID";
    private static final String MDC_REQUEST_ID = "requestId";
    private static final Logger log = LoggerFactory.getLogger(RequestCorrelationFilter.class);

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        var requestId = LogSanitizer.normalizeRequestId(request.getHeader(REQUEST_ID_HEADER));
        var startNanos = System.nanoTime();
        Exception failure = null;

        MDC.put(MDC_REQUEST_ID, requestId);
        response.setHeader(REQUEST_ID_HEADER, requestId);
        try {
            filterChain.doFilter(request, response);
        } catch (IOException | ServletException | RuntimeException ex) {
            failure = ex;
            throw ex;
        } finally {
            var durationMs = (System.nanoTime() - startNanos) / 1_000_000;
            var status = failure == null ? response.getStatus() : Math.max(response.getStatus(), 500);
            logRequest(request, status, durationMs, failure);
            MDC.remove(MDC_REQUEST_ID);
        }
    }

    private void logRequest(HttpServletRequest request, int status, long durationMs, Exception failure) {
        var method = LogSanitizer.sanitizeMessage(request.getMethod());
        var path = LogSanitizer.sanitizePath(request.getRequestURI());
        var clientIp = clientIp(request);

        if (failure != null) {
            log.warn(
                "http_request method={} path={} status={} durationMs={} clientIp={} exception={}",
                method,
                path,
                status,
                durationMs,
                clientIp,
                failure.getClass().getName()
            );
            return;
        }

        if (status >= 500) {
            log.warn(
                "http_request method={} path={} status={} durationMs={} clientIp={}",
                method,
                path,
                status,
                durationMs,
                clientIp
            );
            return;
        }

        log.info(
            "http_request method={} path={} status={} durationMs={} clientIp={}",
            method,
            path,
            status,
            durationMs,
            clientIp
        );
    }

    private String clientIp(HttpServletRequest request) {
        var forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return LogSanitizer.sanitizeClientIp(forwardedFor);
        }
        return LogSanitizer.sanitizeClientIp(request.getRemoteAddr());
    }
}
