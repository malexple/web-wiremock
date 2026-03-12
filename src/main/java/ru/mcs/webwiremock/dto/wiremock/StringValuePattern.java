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
public class StringValuePattern {
    // --- Строковые операторы ---
    private String equalTo;
    private String contains;
    private String doesNotContain;
    private String matches;
    private String doesNotMatch;
    private Boolean absent;
    private Boolean caseInsensitive;

    // --- JSON операторы ---
    private String equalToJson;
    private Boolean ignoreArrayOrder;
    private Boolean ignoreExtraElements;
    private String matchesJsonPath;

    // --- XML операторы ---
    private String equalToXml;
    private String matchesXPath;

    // --- Числовые операторы (WireMock 3.x) ---
    private Object equalToNumber;
    private Object greaterThan;
    private Object greaterThanOrEqual;
    private Object lessThan;
    private Object lessThanOrEqual;
}
