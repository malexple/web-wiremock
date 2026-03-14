package ru.mcs.webwiremock.dto.ui;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScenarioStep {
    /** Порядковый номер шага (1-based) */
    private int index;
    /** Состояние при котором этот стаб активен (requiredScenarioState) */
    private String requiredState;
    /** Состояние после срабатывания (newScenarioState), null = терминальный */
    private String newState;
    /** Человекочитаемая метка: "Step 1" по умолчанию или пользовательская */
    private String label;
    private String stubId;
    private String stubName;
    private String method;
    private String url;
    private Integer responseStatus;
    /** Это шаг, который сработает следующим (currentState == requiredState) */
    private boolean active;
    /** Последний шаг в цепочке */
    private boolean terminal;
}