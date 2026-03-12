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
    /** UUID стаба, генерируется WireMock если не задан */
    private String id;

    /** Человекочитаемое имя — отображается в дереве UI */
    private String name;

    /**
     * Приоритет: меньше = выше приоритет (default WireMock = 5).
     * Стабы с JWT-матчером (клиентские) ставим в 1,
     * общие прокси-стабы — в 10.
     */
    private Integer priority;

    private Boolean persistent;

    private StubMappingRequest request;
    private StubMappingResponse response;

    /**
     * Наши метаданные: clientId, clientName, description, proxyStub.
     * WireMock хранит произвольный JSON в этом поле.
     */
    private StubMetadata metadata;
}
