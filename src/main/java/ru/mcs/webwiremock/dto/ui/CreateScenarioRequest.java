package ru.mcs.webwiremock.dto.ui;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateScenarioRequest {
    private String scenarioName;
    /** JWT externalId клиента. null = глобальный сценарий */
    private String externalId;
    private List<CreateScenarioStepRequest> steps;
}