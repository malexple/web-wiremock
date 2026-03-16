package ru.mcs.webwiremock.dto.ui;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecordingStubInfo {

    private String id;
    private String name;
    private String method;
    private String url;
    private Integer responseStatus;

    /** Стаб является частью сценария (repeatsAsScenarios сработал) */
    private boolean hasScenario;
    private String scenarioName;
}
