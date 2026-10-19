package com.example.ProctorX.Config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.Set;
import java.util.concurrent.TimeUnit;

@Service
public class RedisCacheService {

    private static final Logger log = LoggerFactory.getLogger(RedisCacheService.class);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public RedisCacheService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Store an object serialized as JSON with a specific TTL.
     */
    public void set(String key, Object value, long timeout, TimeUnit unit) {
        try {
            if (value == null) {
                redisTemplate.delete(key);
                return;
            }
            String json = (value instanceof String s) ? s : objectMapper.writeValueAsString(value);
            redisTemplate.opsForValue().set(key, json, timeout, unit);
        } catch (Exception e) {
            log.warn("Redis set failed for key '{}': {}", key, e.getMessage());
        }
    }

    /**
     * Store an object serialized as JSON indefinitely.
     */
    public void set(String key, Object value) {
        try {
            if (value == null) {
                redisTemplate.delete(key);
                return;
            }
            String json = (value instanceof String s) ? s : objectMapper.writeValueAsString(value);
            redisTemplate.opsForValue().set(key, json);
        } catch (Exception e) {
            log.warn("Redis set failed for key '{}': {}", key, e.getMessage());
        }
    }

    /**
     * Retrieve an object deserialized from JSON by class.
     */
    public <T> T get(String key, Class<T> clazz) {
        try {
            String json = redisTemplate.opsForValue().get(key);
            if (json == null || json.isBlank()) {
                return null;
            }
            if (clazz.equals(String.class)) {
                return clazz.cast(json);
            }
            return objectMapper.readValue(json, clazz);
        } catch (Exception e) {
            log.warn("Redis get failed for key '{}': {}", key, e.getMessage());
            return null;
        }
    }

    /**
     * Retrieve an object deserialized from JSON with complex type reference.
     */
    public <T> T get(String key, TypeReference<T> typeReference) {
        try {
            String json = redisTemplate.opsForValue().get(key);
            if (json == null || json.isBlank()) {
                return null;
            }
            return objectMapper.readValue(json, typeReference);
        } catch (Exception e) {
            log.warn("Redis get with TypeReference failed for key '{}': {}", key, e.getMessage());
            return null;
        }
    }

    /**
     * Check if key exists in Redis.
     */
    public boolean hasKey(String key) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(key));
        } catch (Exception e) {
            log.warn("Redis hasKey check failed for key '{}': {}", key, e.getMessage());
            return false;
        }
    }

    /**
     * Delete key from Redis.
     */
    public boolean delete(String key) {
        try {
            return Boolean.TRUE.equals(redisTemplate.delete(key));
        } catch (Exception e) {
            log.warn("Redis delete failed for key '{}': {}", key, e.getMessage());
            return false;
        }
    }

    /**
     * Delete all keys matching a pattern (e.g. proctorx:active_exam:*).
     */
    public void deletePattern(String pattern) {
        try {
            Set<String> keys = redisTemplate.keys(pattern);
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (Exception e) {
            log.warn("Redis deletePattern failed for pattern '{}': {}", pattern, e.getMessage());
        }
    }

    /**
     * Atomic increment with automatic TTL set on creation.
     */
    public Long increment(String key, long delta, long timeoutSeconds) {
        try {
            Long count = redisTemplate.opsForValue().increment(key, delta);
            if (count != null && count == delta && timeoutSeconds > 0) {
                redisTemplate.expire(key, timeoutSeconds, TimeUnit.SECONDS);
            }
            return count;
        } catch (Exception e) {
            log.warn("Redis increment failed for key '{}': {}", key, e.getMessage());
            return 1L;
        }
    }

    /**
     * Rate limiter helper: allows maxRequests within windowSeconds.
     * Returns true if allowed, false if limit exceeded.
     */
    public boolean checkRateLimit(String key, long maxRequests, long windowSeconds) {
        try {
            Long count = increment(key, 1L, windowSeconds);
            return count != null && count <= maxRequests;
        } catch (Exception e) {
            log.warn("Redis rate limiter check failed for key '{}': {}", key, e.getMessage());
            return true; // Fail open to avoid blocking legitimate users on cache failure
        }
    }
}
