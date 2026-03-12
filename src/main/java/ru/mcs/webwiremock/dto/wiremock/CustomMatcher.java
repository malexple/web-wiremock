package ru.mcs.webwiremock.dto.wiremock;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CustomMatcher {
    /**
     * Имя расширения — например "jwt-matcher"
     */
    private String name;

    /**
     * Параметры матчера, например:
     * {
     *   "header": {"alg": "HS256", "typ": "JWT"},
     *   "payload": {"externalId": "USER_GUID"}
     * }
     */
    private Map<String, Object> parameters;
}
