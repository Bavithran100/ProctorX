package com.example.ProctorX.Config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisHttpSession;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

@Configuration
@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 172800, redisNamespace = "proctorx:session")
public class RedisSessionConfig {

    @Value("${server.servlet.session.cookie.same-site:Lax}")
    private String cookieSameSite;

    @Value("${server.servlet.session.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${server.servlet.session.cookie.partitioned:false}")
    private boolean cookiePartitioned;

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
