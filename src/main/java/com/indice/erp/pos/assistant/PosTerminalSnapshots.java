package com.indice.erp.pos.assistant;
import com.fasterxml.jackson.databind.*;
import java.math.BigDecimal;
import java.security.MessageDigest;
import java.util.HexFormat;
public final class PosTerminalSnapshots {
    private static final ObjectMapper JSON=new ObjectMapper().findAndRegisterModules();
    private PosTerminalSnapshots() {}
    public record Charge(BigDecimal amount,String currency,String fingerprint) {}
    public static String hash(Object value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(JSON.writeValueAsBytes(value)));}catch(Exception e){throw new IllegalStateException("Invalid terminal snapshot.",e);}}
    public static JsonNode canonical(Object value){try{return JSON.reader().with(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readTree(JSON.writeValueAsString(value));}catch(Exception e){throw new IllegalStateException("Invalid terminal snapshot.",e);}}
}
