package com.indice.erp.ai.files;

import com.fasterxml.jackson.databind.*;
import java.io.*;
import java.lang.reflect.Type;
import org.springframework.core.MethodParameter;
import org.springframework.http.*;
import org.springframework.http.converter.*;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;

/** Reject injected/unknown fields and bound JSON before either Jackson deserialization pass. */
@ControllerAdvice(assignableTypes=AiFileApiController.class)
public class AiFileRequestAdvice extends RequestBodyAdviceAdapter {
    private final ObjectMapper mapper;
    public AiFileRequestAdvice(ObjectMapper mapper){this.mapper=mapper.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT);}
    @Override public boolean supports(MethodParameter parameter,Type type,Class<? extends HttpMessageConverter<?>> converter){return parameter.getContainingClass()==AiFileApiController.class;}
    @Override public HttpInputMessage beforeBodyRead(HttpInputMessage input,MethodParameter parameter,Type type,Class<? extends HttpMessageConverter<?>> converter)throws IOException {
        int maximum=type==AiFileContracts.StageRequest.class?14*1024*1024:4096;
        byte[] bytes=input.getBody().readNBytes(maximum+1);
        if(bytes.length>maximum)throw new HttpMessageNotReadableException("File request exceeds its size limit.",input);
        try{mapper.readValue(bytes,mapper.constructType(type));}
        catch(IOException|IllegalArgumentException e){throw new HttpMessageNotReadableException("Invalid or unsupported file request fields.",input);}
        return new HttpInputMessage(){public HttpHeaders getHeaders(){return input.getHeaders();}public InputStream getBody(){return new ByteArrayInputStream(bytes);}};
    }
}
