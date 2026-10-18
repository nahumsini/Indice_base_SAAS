package com.indice.erp.email.accounts;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

/** Avoid logging or serializing rejected values from credential-bearing request bodies. */
@RestControllerAdvice(assignableTypes=EmailAccountController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class EmailAccountExceptionHandler {
    @ExceptionHandler({MethodArgumentNotValidException.class,HttpMessageNotReadableException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Error invalid() {return new Error("email_input_invalid");}
    public record Error(String code) { }
}
