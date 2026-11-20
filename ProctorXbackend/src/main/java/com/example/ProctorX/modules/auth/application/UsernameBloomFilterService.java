package com.example.ProctorX.Service;

import com.example.ProctorX.Repository.AuthRepository;
import com.google.common.hash.BloomFilter;
import com.google.common.hash.Funnels;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class UsernameBloomFilterService {

    private static final Logger log = LoggerFactory.getLogger(UsernameBloomFilterService.class);

    private final AuthRepository authRepository;

    // Bloom Filter sized for 500,000 usernames with a 1% (0.01) false-positive probability
    private static final int EXPECTED_INSERTIONS = 500_000;
    private static final double FALSE_POSITIVE_PROBABILITY = 0.01;

    private BloomFilter<CharSequence> bloomFilter;

    @Autowired
    public UsernameBloomFilterService(AuthRepository authRepository) {
        this.authRepository = authRepository;
        this.bloomFilter = BloomFilter.create(
                Funnels.stringFunnel(StandardCharsets.UTF_8),
                EXPECTED_INSERTIONS,
                FALSE_POSITIVE_PROBABILITY
        );
    }

    @PostConstruct
    public void init() {
        try {
            List<String> usernames = authRepository.findAllUsernames();
            int count = 0;
            for (String username : usernames) {
                if (username != null && !username.trim().isEmpty()) {
                    bloomFilter.put(normalize(username));
                    count++;
                }
            }
            log.info("🚀 [BloomFilter] Initialized with {} registered usernames (O(1) uniqueness check ready).", count);
        } catch (Exception e) {
            log.warn("⚠️ [BloomFilter] Could not preload usernames at startup: {}", e.getMessage());
        }
    }

    /**
     * Checks if a username is available.
     * 1. If Bloom Filter says NOT PRESENT -> 100% guaranteed available (Zero DB queries).
     * 2. If Bloom Filter says MIGHT BE PRESENT -> Query DB to eliminate the 1% false-positive collision.
     *
     * @param rawUsername the candidate username
     * @return true if available, false if already taken
     */
    public boolean isUsernameAvailable(String rawUsername) {
        if (rawUsername == null) return false;
        String normalized = normalize(rawUsername);
        if (normalized.length() < 3 || normalized.length() > 30) {
            return false;
        }

        // Tier 1: Fast O(1) in-memory Bloom Filter check
        if (!bloomFilter.mightContain(normalized)) {
            // Guaranteed: Does NOT exist in DB!
            return true;
        }

        // Tier 2: Might exist (or 1% false positive) -> Confirm in database
        boolean existsInDb = authRepository.existsByUsernameIgnoreCase(normalized);
        return !existsInDb;
    }

    /**
     * Registers a new username into the Bloom Filter immediately after account creation.
     */
    public void registerUsername(String rawUsername) {
        if (rawUsername != null && !rawUsername.trim().isEmpty()) {
            bloomFilter.put(normalize(rawUsername));
        }
    }

    private String normalize(String username) {
        return username.trim().toLowerCase();
    }
}

