package ru.mcs.webwiremock.dto.ui;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateScenarioStepRequest {
    /**
     * Метка состояния (requiredScenarioState для этого шага).
     * Шаг 1 всегда "Started", остальные — пользовательские или "Step N".
     */
    private String stateLabel;

    /** UUID существующего стаба для клонирования. null = создать новый */
    private String sourceStubId;

    // ─── Поля для нового стаба (используются если sourceStubId == null) ───
    private String method;
    private String urlPath;
    private Integer responseStatus;
    private String responseBody;
    private String contentType;
}