package ru.mcs.webwiremock.dto.wiremock;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class LoggedRequest {
    private String id;
    private String url;
    private String absoluteUrl;
    private String method;
    private String clientIp;
    private Map<String, String> headers;
    private Map<String, String> cookies;
    private String body;
    private Boolean browserProxyRequest;
    private Long loggedDate;
    private String loggedDateString;
    private Boolean wasMatched;

    /**
     * WireMock возвращает {"id": "stub-uuid"} — используем Map для гибкости
     */
    private Map<String, String> matchedStubId;

    private RequestTiming timing;
}
