# API image for production. Build from the api/ folder: docker build -t nepnha-api api
# Stage 1 builds the jar with the Maven wrapper; stage 2 has only the JRE and the jar.

FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
# Dependencies first, so a code change does not download them again.
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src src
RUN ./mvnw -B -q -DskipTests package \
 && cp target/nepnha-api-*.jar /src/app.jar

FROM eclipse-temurin:21-jre
# A fixed UID: the media folder on the VPS (/srv/nepnha/media) is owned by this UID.
RUN groupadd --system --gid 10001 nepnha \
 && useradd --system --uid 10001 --gid nepnha --no-create-home nepnha \
 && mkdir -p /data/media \
 && chown nepnha:nepnha /data/media
COPY --from=build /src/app.jar /app/app.jar
USER nepnha
ENV MEDIA_DIR=/data/media \
    JAVA_OPTS="-Xmx768m -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
# /tmp stays writable: Tomcat stores multipart parts there.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
