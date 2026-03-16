package ru.mcs.webwiremock.dto.wiremock;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RecordingResult {

    /** Стабы, созданные WireMock в момент Stop */
    private List<StubMapping> mappings;

    /** Метаданные ответа */
    private Meta meta;
}
