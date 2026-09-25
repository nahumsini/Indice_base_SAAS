package com.indice.erp.pos.square;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class SquareWebhookBodyReader {
    private final int limit;
    SquareWebhookBodyReader(SquareWebhookProperties properties) {
        this.limit = Math.clamp(properties.getMaxWebhookBytes(), 1_024, 1_048_576);
    }
    String read(HttpServletRequest request) {
        if (request.getContentLengthLong() > limit) throw tooLarge();
        try {
            var bytes = request.getInputStream().readNBytes(limit + 1);
            if (bytes.length > limit) throw tooLarge();
            return StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
        } catch (ResponseStatusException known) {
            throw known;
        } catch (Exception invalid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Square webhook body is invalid.");
        }
    }
    private ResponseStatusException tooLarge() {
        return new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Square webhook body is too large.");
    }
}
