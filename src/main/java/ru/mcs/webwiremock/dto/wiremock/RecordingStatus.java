package ru.mcs.webwiremock.dto.wiremock;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RecordingStatus {

    /**
     * Текущий статус.
     * Возможные значения: NeverStarted | Recording | Stopped
     */
    private String status;

    /** URL целевого сервиса, если запись активна */
    private String targetBaseUrl;
}
