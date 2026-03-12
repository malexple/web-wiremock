package ru.mcs.webwiremock.dto.wiremock;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
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
public class StubMappingRequest {
    /**
     * HTTP-метод: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS, TRACE, ANY
     */
    private String method;

    // --- URL-matching (заполняется ровно одно из полей) ---
    /** Точное совпадение пути + query */
    private String url;
    /** Regex совпадение пути + query */
    private String urlPattern;
    /** Точное совпадение только пути */
    private String urlPath;
    /** Regex совпадение только пути */
    private String urlPathPattern;
    /** RFC 6570 шаблон пути (WireMock 3+) */
    private String urlPathTemplate;

    // --- Matchers ---
    private Map<String, StringValuePattern> headers;
    private Map<String, StringValuePattern> queryParameters;
    private Map<String, StringValuePattern> cookies;
    private Map<String, StringValuePattern> pathParameters;
    private List<StringValuePattern> bodyPatterns;

    /**
     * Кастомный матчер расширения, например jwt-matcher
     */
    private CustomMatcher customMatcher;
}
