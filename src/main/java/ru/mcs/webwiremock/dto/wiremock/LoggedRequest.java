package ru.mcs.webwiremock.dto.wiremock;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.Map;

/**
 * Внутренний объект запроса внутри ServeEvent.
 * WireMock структура: ServeEvent.request → LoggedRequest
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class LoggedRequest {
    private String url;
    private String absoluteUrl;
    private String method;
    private String clientIp;
    private Map<String, String> headers;
    private Map<String, String> cookies;
    private String body;
    private String bodyAsBase64;
    private Long loggedDate;
    private String loggedDateString;
    private Boolean browserProxyRequest;
}
