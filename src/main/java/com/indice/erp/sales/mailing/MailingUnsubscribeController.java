package com.indice.erp.sales.mailing;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;
/** Public alternate trust: recipient-scoped authenticated capability; no session authority is accepted. */
@RestController
public class MailingUnsubscribeController {
    private final MailingUnsubscribeService service;
    public MailingUnsubscribeController(MailingUnsubscribeService service){this.service=service;}
    public record Input(@Size(max=100)String token){@Override public String toString(){return "Unsubscribe[redacted]";}}
    public record Result(boolean received){ }
    @PostMapping("/api/public/mailing/unsubscribe") public Result unsubscribe(@Valid @RequestBody Input input,HttpServletRequest request){service.unsubscribe(input.token(),request.getRemoteAddr());return new Result(true);}
}
