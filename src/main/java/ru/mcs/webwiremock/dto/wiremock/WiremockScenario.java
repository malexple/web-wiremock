package ru.mcs.webwiremock.dto.wiremock;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class WiremockScenario {
    private String id;
    private String name;
    /** Текущее состояние — это requiredScenarioState стаба который сработает СЛЕДУЮЩИМ */
    private String state;
    private List<String> possibleStates;
}