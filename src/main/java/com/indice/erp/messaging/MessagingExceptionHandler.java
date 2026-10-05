package com.indice.erp.messaging;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import com.indice.erp.platformadmin.PlatformAdminForbiddenException;
import com.indice.erp.distributorportal.DistributorPortalForbiddenException;

@RestControllerAdvice(assignableTypes=MessagingController.class)
public class MessagingExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> invalid(IllegalArgumentException error) {
        boolean csrf="Invalid CSRF token.".equals(error.getMessage());
        return ResponseEntity.status(csrf?403:400).body(Map.of("message",csrf?"Invalid CSRF token.":"Invalid messaging request."));
    }
    @ExceptionHandler({PlatformAdminForbiddenException.class,DistributorPortalForbiddenException.class})
    public ResponseEntity<?> forbidden(RuntimeException error) {
        return ResponseEntity.status(403).body(Map.of("message","Messaging access denied."));
    }
}
