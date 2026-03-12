package ru.mcs.webwiremock.client;

import feign.Response;
import feign.codec.ErrorDecoder;
import lombok.extern.slf4j.Slf4j;
import ru.mcs.webwiremock.exception.WiremockApiException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Slf4j
public class WiremockFeignErrorDecoder implements ErrorDecoder {

    @Override
    public Exception decode(String methodKey, Response response) {
        String body = readBody(response);
        String message = "WireMock API error [%s] status=%d: %s".formatted(methodKey, response.status(), body);
        log.error(message);
        return new WiremockApiException(message, response.status());
    }

    private String readBody(Response response) {
        if (response.body() == null) return "<empty body>";
        try {
            return new String(response.body().asInputStream().readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            return "<unreadable body>";
        }
    }
}