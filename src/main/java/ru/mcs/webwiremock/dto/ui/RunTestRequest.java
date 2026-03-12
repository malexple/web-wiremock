package ru.mcs.webwiremock.dto.ui;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RunTestRequest {

    /** HTTP-метод: GET, POST, PUT, DELETE, PATCH */
    private String method;

    /**
     * Полный URL для вызова (например http://wiremock:8080/api/v1/users).
     * Формируется в UI из wiremockHost + path стаба.
     */
    private String url;

    /** Заголовки запроса */
    private Map<String, String> headers;

    /** Тело запроса (для POST/PUT/PATCH) */
    private String body;

    /** Таймаут в миллисекундах, default 10000 */
    private Integer timeoutMs;
}