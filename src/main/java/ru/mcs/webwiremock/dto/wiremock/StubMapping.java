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
public class StubMapping {
    private String id;
    private String name;
    private Integer priority;
    private Boolean persistent;
    private StubMappingRequest request;
    private StubMappingResponse response;
    private StubMetadata metadata;

    // ─── Scenario fields ──────────────────────────────────────
    private String scenarioName;
    private String requiredScenarioState;
    private String newScenarioState;
}