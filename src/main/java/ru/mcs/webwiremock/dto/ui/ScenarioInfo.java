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
public class ScenarioInfo {
    private String name;
    /** Текущее состояние сценария в WireMock */
    private String currentState;
    /** Все возможные состояния (от WireMock) */
    private List<String> possibleStates;
    /** Упорядоченная цепочка шагов */
    private List<ScenarioStep> steps;
    private int stepCount;
    /** JWT externalId из метаданных первого стаба, null = глобальный */
    private String externalId;
    private boolean global;
    /** Состояние для кнопки "← Назад", null = уже на первом шаге */
    private String prevState;
    /** Состояние для кнопки "→ Вперёд", null = уже на последнем */
    private String nextState;
    /** true если сценарий завершён (прошли все шаги) */
    private boolean completed;
}