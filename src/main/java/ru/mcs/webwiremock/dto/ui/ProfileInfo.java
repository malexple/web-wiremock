package ru.mcs.webwiremock.dto.ui;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ProfileInfo {
    private String name;
    private String description;
    private int stubCount;
    private Instant createdAt;
    private Instant updatedAt;
}