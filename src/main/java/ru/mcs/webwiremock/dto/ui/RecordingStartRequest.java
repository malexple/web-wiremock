package ru.mcs.webwiremock.dto.ui;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RecordingStartRequest {

    /** URL реального сервиса */
    private String targetBaseUrl;

    /** Regex-фильтр по URL-пути (опционально) */
    private String urlPathPattern;

    /** Повторные запросы → шаги Scenario */
    private Boolean repeatsAsScenarios;
}
