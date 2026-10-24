package com.indice.erp.sales.mailing;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.server.ResponseStatusException;
@RestControllerAdvice(assignableTypes={MailingController.class,MailingDeliveryController.class,MailingUnsubscribeController.class})
@Order(Ordered.HIGHEST_PRECEDENCE)
public class MailingDeliveryExceptionHandler {
    public record Error(String code){ }
    @ExceptionHandler({MethodArgumentNotValidException.class,HttpMessageNotReadableException.class}) @ResponseStatus(HttpStatus.BAD_REQUEST) public Error invalid(){return new Error("mailing_input_invalid");}
    @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<Error> status(ResponseStatusException e){String code=e.getReason();return ResponseEntity.status(e.getStatusCode()).body(new Error(code!=null&&code.matches("(?:email|mailing)_[a-z_]+")?code:"mailing_access_denied"));}
}
