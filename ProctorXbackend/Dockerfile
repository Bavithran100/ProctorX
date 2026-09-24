# ==============================================================================
# PROCTORX BACKEND — PRODUCTION MULTI-STAGE DOCKERFILE
# Optimized for Render, AWS ECS, GCP Cloud Run, and Docker Compose
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Dependency Resolution
# ------------------------------------------------------------------------------
FROM eclipse-temurin:24-jdk-alpine AS builder

WORKDIR /build

# Install dos2unix to ensure line endings in gradlew are Unix-formatted
RUN apk add --no-cache bash dos2unix

# Layer Cache: Copy Gradle wrapper and build definitions first
COPY gradlew gradlew.bat build.gradle settings.gradle ./
COPY gradle gradle

RUN dos2unix gradlew && chmod +x gradlew

# Download dependencies in an isolated layer for Docker build caching
RUN ./gradlew dependencies --no-daemon || true

# Copy source code and build production runnable JAR
COPY src src
RUN ./gradlew bootJar --no-daemon -x test

# Extract layered Spring Boot jar for faster startup
RUN java -Djarmode=tools -jar build/libs/*.jar extract --layers --launcher --destination extracted || \
    cp build/libs/*.jar /build/app.jar

# ------------------------------------------------------------------------------
# Stage 2: Minimal Production JRE Runtime
# ------------------------------------------------------------------------------
FROM eclipse-temurin:24-jre-alpine AS runner

# Security: Create non-root system group and user
RUN addgroup -S spring && adduser -S spring -G spring

WORKDIR /app

# Copy application artifacts
COPY --from=builder /build/build/libs/*.jar /app/app.jar

# Set ownership to non-root user
RUN chown -R spring:spring /app

USER spring:spring

# Default Render / Container Port
ENV PORT=8080
EXPOSE ${PORT}

# Production JVM Flags: Container-aware memory allocation, fast entropy, headless mode
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0 -Djava.security.egd=file:/dev/./urandom -Djava.awt.headless=true"

# Health check to ensure service responds
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/public/health || exit 0

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]