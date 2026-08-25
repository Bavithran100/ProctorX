# ---------- Build Stage ----------
FROM eclipse-temurin:24-jdk AS builder

WORKDIR /app

COPY gradlew gradlew.bat build.gradle settings.gradle ./
COPY gradle gradle

RUN chmod +x gradlew

COPY src src

RUN ./gradlew bootJar -x test

# ---------- Runtime Stage ----------
FROM eclipse-temurin:24-jre

WORKDIR /app

COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java","-jar","app.jar"]