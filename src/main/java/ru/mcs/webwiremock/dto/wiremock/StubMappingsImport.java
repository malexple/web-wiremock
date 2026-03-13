package ru.mcs.webwiremock.dto.wiremock;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StubMappingsImport {
    private List<StubMapping> mappings;
    private ImportOptions importOptions;
}