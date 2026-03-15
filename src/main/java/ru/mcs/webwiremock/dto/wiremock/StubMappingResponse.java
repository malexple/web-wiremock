package ru.mcs.webwiremock.dto.wiremock;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StubMappingResponse {
    private Integer status;
    private String statusMessage;

    /** Заголовки ответа. Значение может быть String или List<String> */
    private Map<String, Object> headers;

    // --- Тело ответа (задаётся одно из полей) ---
    /** Текстовое тело */
    private String body;
    /** JSON-тело (хранится как объект, без экранирования) */
    private JsonNode jsonBody;
    /** Base64-закодированное тело (для бинарных ответов) */
    private String base64Body;
    /** Имя файла из папки __files */
    private String bodyFileName;

    // --- Задержка ---
    private Integer fixedDelayMilliseconds;

    // --- Handlebars response-template ---
    private List<String> transformers;
    private Map<String, Object> transformerParameters;

    // --- Прокси ---
    private String proxyBaseUrl;
    private Map<String, String> additionalProxyRequestHeaders;
    private List<String> removeProxyRequestHeaders;

    // --- Fault injection ---
    private String fault;
    private ChunkedDribbleDelay chunkedDribbleDelay;
}
