# ─── Stage 1: сборка ───────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon --quiet || true

COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# ─── Stage 2: runtime ──────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

LABEL org.opencontainers.image.title="web-wiremock" \
      org.opencontainers.image.description="Web UI for WireMock stub management" \
      org.opencontainers.image.source="https://github.com/malexple/web-wiremock"

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/build/libs/web-wiremock.jar app.jar

USER appuser

EXPOSE 8080

ENTRYPOINT ["java", \
            "-XX:+UseContainerSupport", \
            "-XX:MaxRAMPercentage=75.0", \
            "-Djava.security.egd=file:/dev/./urandom", \
            "-jar", "app.jar"]
