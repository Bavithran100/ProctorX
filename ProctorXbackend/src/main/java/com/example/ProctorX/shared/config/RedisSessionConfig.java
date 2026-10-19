package com.example.ProctorX.Config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisHttpSession;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

import java.net.URI;

@Configuration
@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 172800, redisNamespace = "proctorx:session")
public class RedisSessionConfig {

    private static final Logger log = LoggerFactory.getLogger(RedisSessionConfig.class);

    @Value("${server.servlet.session.cookie.same-site:Lax}")
    private String cookieSameSite;

    @Value("${server.servlet.session.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${server.servlet.session.cookie.partitioned:false}")
    private boolean cookiePartitioned;

    @Bean
    public LettuceConnectionFactory redisConnectionFactory(
            @Value("${spring.data.redis.url:}") String redisUrl,
            @Value("${REDIS_URL:}") String envRedisUrl,
            @Value("${spring.data.redis.host:localhost}") String host,
            @Value("${spring.data.redis.port:6379}") int port,
            @Value("${spring.data.redis.password:}") String password) {

        String effectiveUrl = (redisUrl != null && !redisUrl.isBlank()) ? redisUrl : envRedisUrl;

        if (effectiveUrl != null && !effectiveUrl.isBlank()) {
            try {
                log.info("Configuring Redis connection via REDIS_URL...");
                URI uri = URI.create(effectiveUrl);
                String uriHost = uri.getHost();
                int uriPort = uri.getPort() > 0 ? uri.getPort() : 6379;
                boolean isSsl = "rediss".equalsIgnoreCase(uri.getScheme());

                RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(uriHost, uriPort);
                String userInfo = uri.getUserInfo();
                if (userInfo != null && !userInfo.isBlank()) {
                    String pass = userInfo.contains(":") ? userInfo.substring(userInfo.indexOf(":") + 1) : userInfo;
                    if (!pass.isBlank()) {
                        config.setPassword(RedisPassword.of(pass));
                    }
                }

                if (isSsl) {
                    LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder().useSsl().build();
                    log.info("Redis SSL enabled for scheme rediss");
                    return new LettuceConnectionFactory(config, clientConfig);
                }
                return new LettuceConnectionFactory(config);
            } catch (Exception e) {
                log.error("Failed to parse REDIS_URL '{}', falling back to host/port: {}", effectiveUrl, e.getMessage());
            }
        }

        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(host, port);
        if (password != null && !password.isBlank()) {
            config.setPassword(RedisPassword.of(password));
        }
        return new LettuceConnectionFactory(config);
    }

    @Bean
    public CookieSerializer cookieSerializer() {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setCookieName("JSESSIONID");
        serializer.setCookiePath("/");
        serializer.setUseHttpOnlyCookie(true);
        // 2 days = 48 hours = 172800 seconds
        serializer.setCookieMaxAge(172800);
        serializer.setSameSite("None".equalsIgnoreCase(cookieSameSite) ? "None" : "Lax");
        serializer.setUseSecureCookie(cookieSecure);
        serializer.setPartitioned(cookiePartitioned);
        return serializer;
    }
}
