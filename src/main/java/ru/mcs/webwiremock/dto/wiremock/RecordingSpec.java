package ru.mcs.webwiremock.dto.wiremock;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecordingSpec {

    /** URL реального сервиса — через него WireMock будет проксировать запросы */
    private String targetBaseUrl;

    /** Фильтр: какие запросы записывать */
    private RecordingFilters filters;

    /** true — повторные одинаковые запросы превращаются в шаги Scenario */
    private Boolean repeatsAsScenarios;

    /** true — записанные стабы сохраняются в файловую систему WireMock */
    @Builder.Default
    private Boolean persist = true;
}
