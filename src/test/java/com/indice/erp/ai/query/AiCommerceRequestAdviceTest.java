package com.indice.erp.ai.query;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.assistant.PosTerminalContracts.Change;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.core.MethodParameter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.http.converter.HttpMessageNotReadableException;
import static org.assertj.core.api.Assertions.*;
class AiCommerceRequestAdviceTest {
    private final AiCommerceRequestAdvice advice=new AiCommerceRequestAdvice(new ObjectMapper().findAndRegisterModules());
    private MethodParameter parameter()throws Exception{return new MethodParameter(com.indice.erp.ai.terminal.AiTerminalApiController.class.getMethod("preview",String.class,String.class,Change.class),2);}
    @Test void rejectsFractionalIdsAndInjectedPaidOrTenantAuthority()throws Exception{
        for(String json:new String[]{"{\"id\":1.5,\"provider\":\"SQUARE\"}","{\"id\":1,\"companyId\":99}","{\"id\":1,\"paid\":true}"})assertThatThrownBy(()->advice.beforeBodyRead(new MockHttpInputMessage(json.getBytes(StandardCharsets.UTF_8)),parameter(),Change.class,MappingJackson2HttpMessageConverter.class)).isInstanceOf(HttpMessageNotReadableException.class);
    }
    @Test void preservesValidNativeDecimalAmountsWithoutRoundingIds()throws Exception{
        var bytes="{\"id\":1,\"provider\":\"SQUARE\",\"refund\":{\"amount\":10.25,\"reason\":\"Customer refund\"}}".getBytes(StandardCharsets.UTF_8);
        var result=advice.beforeBodyRead(new MockHttpInputMessage(bytes),parameter(),Change.class,MappingJackson2HttpMessageConverter.class);assertThat(result.getBody().readAllBytes()).isEqualTo(bytes);
    }
}
