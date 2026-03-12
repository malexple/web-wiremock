package ru.mcs.webwiremock.dto.ui;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RunTestResponse {

    private int statusCode;
    private String statusText;
    private Map<String, String> responseHeaders;
    private String responseBody;

    /** Время выполнения запроса в миллисекундах */
    private long durationMs;

    /** true — запрос выполнен успешно (2xx), false — ошибка */
    private boolean success;
}