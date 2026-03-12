package ru.mcs.webwiremock.dto.wiremock;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.Map;

/**
 * Верхнеуровневый объект из GET /__admin/requests.
 *
 * Реальная структура WireMock:
 * {
 *   "id": "...",
 *   "request": { "url": "...", "method": "GET", ... },  ← LoggedRequest
 *   "wasMatched": true,
 *   "timing": { ... },
 *   "matchedStubId": { "id": "stub-uuid" }
 * }
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ServeEvent {
    private String id;
    private LoggedRequest request;
    private Boolean wasMatched;
    private RequestTiming timing;
    private Map<String, String> matchedStubId;
}
