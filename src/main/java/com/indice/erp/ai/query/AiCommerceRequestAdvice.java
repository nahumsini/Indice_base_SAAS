package com.indice.erp.ai.query;
import com.fasterxml.jackson.databind.*;
import java.io.*;
import java.lang.reflect.Type;
import org.springframework.core.MethodParameter;
import org.springframework.http.*;
import org.springframework.http.converter.*;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;
/** Closed commerce request envelopes; fractional IDs are never silently truncated. */
@ControllerAdvice(assignableTypes={com.indice.erp.ai.inventory.AiInventoryApiController.class,com.indice.erp.ai.inventorycatalog.AiInventoryCatalogApiController.class,
    com.indice.erp.ai.procurement.AiProcurementApiController.class,com.indice.erp.ai.salesworkflow.AiSalesWorkflowApiController.class,
    com.indice.erp.ai.commission.AiCommissionApiController.class,com.indice.erp.ai.pos.AiPosApiController.class,
    com.indice.erp.ai.posoperations.AiPosOperationsApiController.class,com.indice.erp.ai.terminal.AiTerminalApiController.class})
public class AiCommerceRequestAdvice extends RequestBodyAdviceAdapter {
    private final ObjectMapper mapper;
    public AiCommerceRequestAdvice(ObjectMapper mapper){this.mapper=mapper.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT);}
    @Override public boolean supports(MethodParameter parameter,Type type,Class<? extends HttpMessageConverter<?>> converter){return parameter.getContainingClass().getPackageName().startsWith("com.indice.erp.ai.");}
    @Override public HttpInputMessage beforeBodyRead(HttpInputMessage input,MethodParameter parameter,Type type,Class<? extends HttpMessageConverter<?>> converter)throws IOException{
        byte[] bytes=input.getBody().readNBytes(262145);if(bytes.length>262144)throw new HttpMessageNotReadableException("Commerce request exceeds its size limit.",input);
        try{mapper.readValue(bytes,mapper.constructType(type));}catch(IOException|IllegalArgumentException e){throw new HttpMessageNotReadableException("Invalid or unsupported commerce request fields.",input);}
        return new HttpInputMessage(){public HttpHeaders getHeaders(){return input.getHeaders();}public InputStream getBody(){return new ByteArrayInputStream(bytes);}};
    }
}
