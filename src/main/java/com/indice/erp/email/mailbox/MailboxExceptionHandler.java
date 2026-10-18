package com.indice.erp.email.mailbox;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(assignableTypes={MailboxController.class,MailFeaturesController.class})
@Order(Ordered.HIGHEST_PRECEDENCE)
public class MailboxExceptionHandler {
    public record Error(String code) { }
    @ExceptionHandler({MethodArgumentNotValidException.class,HttpMessageNotReadableException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Error invalid(){return new Error("email_input_invalid");}
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Error> status(ResponseStatusException exception){String reason=exception.getReason();return ResponseEntity.status(exception.getStatusCode()).body(new Error(reason!=null&&reason.matches("email_[a-z_]+")?reason:"email_access_denied"));}
}
