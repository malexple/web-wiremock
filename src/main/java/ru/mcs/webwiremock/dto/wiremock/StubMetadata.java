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
public class StubMetadata {
    /**
     * externalId из JWT-payload — ключевой идентификатор клиента
     */
    private String clientId;

    /**
     * Читаемое имя клиента, задаётся вручную в UI
     */
    private String clientName;

    /**
     * Произвольное описание стаба
     */
    private String description;

    /**
     * Признак: этот стаб является прокси-стабом
     */
    private Boolean proxyStub;

    /**
     * clientId, для которого этот прокси-стаб создан
     * null = общий прокси для всех остальных
     */
    private String proxyForClientId;
}
