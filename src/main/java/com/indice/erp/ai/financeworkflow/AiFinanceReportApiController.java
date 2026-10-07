package com.indice.erp.ai.financeworkflow;

import com.indice.erp.ai.access.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class AiFinanceReportApiController {
    private final AiAccessTokenService tokens;
    private final AiFinanceReportService reports;
    private final AiToolUsageAuditService audit;
    @PostMapping("/api/v1/ai/tools/files/export_finance_report")
    public ResponseEntity<?> export(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@RequestBody AiFinanceReportService.Request request){
        var token=tokens.authenticate(bearer,"files.read");if(token.isEmpty())return ResponseEntity.status(401).body(Map.of("code","invalid_token","message","Valid delegated file consent required."));
        try{var result=reports.export(token.get(),request);audit.recordRead(token.get(),"export_finance_report","SUCCESS",200);return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL,"no-store").body(result);}
        catch(SecurityException e){audit.recordRead(token.get(),"export_finance_report","FAILURE",403);return ResponseEntity.status(403).body(Map.of("code","report_permission_required","message","Current report, module, tab and private file consent required."));}
        catch(NoSuchElementException e){audit.recordRead(token.get(),"export_finance_report","FAILURE",404);return ResponseEntity.status(404).body(Map.of("code","report_target_not_found","message","The selected record is outside the authorized scope."));}
        catch(com.indice.erp.finance.FinanceApiException e){audit.recordRead(token.get(),"export_finance_report","FAILURE",e.status().value());return ResponseEntity.status(e.status()).header(HttpHeaders.CACHE_CONTROL,"no-store").body(Map.of("code","report_owner_rejected","message","Review the selected finance report and authorized records."));}
        catch(IllegalArgumentException e){audit.recordRead(token.get(),"export_finance_report","FAILURE",400);return ResponseEntity.badRequest().body(Map.of("code","invalid_report_request","message",e.getMessage()));}
    }
}
