package com.indice.erp.ai.files;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.*;
import org.springframework.http.converter.*;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import static org.assertj.core.api.Assertions.*;

class AiFileRequestAdviceTest {
    private final AiFileRequestAdvice advice=new AiFileRequestAdvice(new ObjectMapper().findAndRegisterModules());
    @Test void rejectsAuthorityUnknownFieldsAndFractionalIdentifiersBeforeControllerExecution() throws Exception {
        for(String body:new String[]{"{\"purpose\":\"task_evidence\",\"targetId\":1,\"companyId\":9}",
            "{\"purpose\":\"task_evidence\",\"targetId\":1.5}",
            "{\"purpose\":\"task_evidence\",\"targetId\":1,\"objectKey\":\"private/key\"}"}) {
            assertThatThrownBy(()->read(body,AiFileContracts.ReadRequest.class)).isInstanceOf(HttpMessageNotReadableException.class)
                .hasMessage("Invalid or unsupported file request fields.");
        }
    }
    @Test void ordinaryRequestsRemainBoundedAndPrivateContentIsRedactedFromDtoLogging() throws Exception {
        assertThatThrownBy(()->read(" ".repeat(4097),AiFileContracts.ReadRequest.class)).isInstanceOf(HttpMessageNotReadableException.class)
            .hasMessage("File request exceeds its size limit.");
        var staged=new AiFileContracts.StageRequest(AiFileContracts.Purpose.task_evidence,1L,null,"evidence.pdf","application/pdf","private-binary","private-retry-key");
        assertThat(staged.toString()).doesNotContain("private-binary","private-retry-key");
        var valid="{\"purpose\":\"task_evidence\",\"targetId\":1,\"attachmentId\":2}";
        assertThat(read(valid,AiFileContracts.ReadRequest.class).getBody().readAllBytes()).isEqualTo(valid.getBytes(StandardCharsets.UTF_8));
    }
    private HttpInputMessage read(String body,Class<?> type) throws Exception {
        var parameter=new MethodParameter(AiFileApiController.class.getMethod("read",String.class,AiFileContracts.ReadRequest.class),1);
        var input=new HttpInputMessage(){public HttpHeaders getHeaders(){return new HttpHeaders();}public InputStream getBody(){return new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8));}};
        return advice.beforeBodyRead(input,parameter,type,MappingJackson2HttpMessageConverter.class);
    }
}
