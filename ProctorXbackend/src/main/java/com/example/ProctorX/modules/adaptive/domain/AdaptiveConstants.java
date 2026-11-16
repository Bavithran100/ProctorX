package com.example.ProctorX.modules.adaptive.domain;

import java.util.*;

public class AdaptiveConstants {

    // =========================================================================
    // 20-D CLEAN HIERARCHICAL MATRIX (Step 1 Architecture)
    // =========================================================================

    // Tier 1: 8 Foundational Prerequisite Concepts
    public static final List<String> CORE_CONCEPTS_20D = List.of(
            "ARRAYS_STRINGS",
            "HASH_TABLES",
            "LINKED_LISTS",
            "STACKS_QUEUES",
            "TREES_BST",
            "GRAPHS",
            "RECURSION_BACKTRACKING",
            "DYNAMIC_PROGRAMMING"
    );

    // Tier 2: 8 Reusable Algorithmic Patterns
    public static final List<String> PATTERNS_20D = List.of(
            "TWO_POINTERS",
            "SLIDING_WINDOW",
            "BINARY_SEARCH",
            "BFS_DFS",
            "MONOTONIC_QUEUE_STACK",
            "TOP_K_HEAP",
            "UNION_FIND",
            "INTERVALS_GREEDY"
    );

    // Tier 3: 4 Empirical Telemetry Competencies (Hardware-independent)
    public static final List<String> COMPETENCIES_20D = List.of(
            "ALGORITHMIC_EFFICIENCY",
            "EDGE_CASE_RESILIENCE",
            "CODE_RELIABILITY",
            "IMPLEMENTATION_FLUENCY"
    );

    // Diagnostic Defect Taxonomy: 4 Core Diagnostic Profiles
    public static final List<String> ERROR_PROFILES_20D = List.of(
            "OFF_BY_ONE",
            "NULL_EMPTY_COLLECTION",
            "TIME_LIMIT_EXCEEDED",
            "STATE_CORRUPTION"
    );

    // =========================================================================
    // DIRECTED ACYCLIC GRAPH (DAG) PREREQUISITE NETWORK (Step 2 Architecture)
    // =========================================================================

    /**
     * Directed Prerequisite DAG: Child Node -> List of Required Prerequisite Parents.
     * Bottom-up rule: If parent prerequisite mastery < PREREQUISITE_GATING_THRESHOLD,
     * child effective mastery is gated.
     */
    public static final Map<String, List<String>> PREREQUISITE_DAG = Map.ofEntries(
            Map.entry("TWO_POINTERS", List.of("ARRAYS_STRINGS")),
            Map.entry("SLIDING_WINDOW", List.of("ARRAYS_STRINGS", "HASH_TABLES", "TWO_POINTERS")),
            Map.entry("BINARY_SEARCH", List.of("ARRAYS_STRINGS")),
            Map.entry("LINKED_LISTS", List.of("ARRAYS_STRINGS")),
            Map.entry("STACKS_QUEUES", List.of("ARRAYS_STRINGS")),
            Map.entry("MONOTONIC_QUEUE_STACK", List.of("STACKS_QUEUES", "ARRAYS_STRINGS")),
            Map.entry("RECURSION_BACKTRACKING", List.of("STACKS_QUEUES")),
            Map.entry("TREES_BST", List.of("RECURSION_BACKTRACKING", "STACKS_QUEUES")),
            Map.entry("BFS_DFS", List.of("TREES_BST", "STACKS_QUEUES", "RECURSION_BACKTRACKING")),
            Map.entry("GRAPHS", List.of("BFS_DFS", "HASH_TABLES")),
            Map.entry("TOP_K_HEAP", List.of("TREES_BST", "ARRAYS_STRINGS")),
            Map.entry("UNION_FIND", List.of("GRAPHS", "ARRAYS_STRINGS")),
            Map.entry("INTERVALS_GREEDY", List.of("ARRAYS_STRINGS", "TWO_POINTERS")),
            Map.entry("DYNAMIC_PROGRAMMING", List.of("RECURSION_BACKTRACKING", "ARRAYS_STRINGS"))
    );

    /**
     * Top-Down Remediation DAG: When student fails a child pattern on edge cases or constraints,
     * which parent prerequisite node receives the diagnostic remediation penalty.
     */
    public static final Map<String, List<String>> REMEDIATION_DAG = Map.ofEntries(
            Map.entry("SLIDING_WINDOW", List.of("TWO_POINTERS", "ARRAYS_STRINGS")),
            Map.entry("DYNAMIC_PROGRAMMING", List.of("RECURSION_BACKTRACKING")),
            Map.entry("BFS_DFS", List.of("TREES_BST", "STACKS_QUEUES")),
            Map.entry("UNION_FIND", List.of("GRAPHS")),
            Map.entry("MONOTONIC_QUEUE_STACK", List.of("STACKS_QUEUES")),
            Map.entry("TOP_K_HEAP", List.of("TREES_BST")),
            Map.entry("TWO_POINTERS", List.of("ARRAYS_STRINGS")),
            Map.entry("INTERVALS_GREEDY", List.of("ARRAYS_STRINGS")),
            Map.entry("TREES_BST", List.of("RECURSION_BACKTRACKING", "STACKS_QUEUES")),
            Map.entry("GRAPHS", List.of("BFS_DFS", "HASH_TABLES")),
            Map.entry("STACKS_QUEUES", List.of("ARRAYS_STRINGS")),
            Map.entry("LINKED_LISTS", List.of("ARRAYS_STRINGS")),
            Map.entry("HASH_TABLES", List.of("ARRAYS_STRINGS")),
            Map.entry("RECURSION_BACKTRACKING", List.of("STACKS_QUEUES"))
    );

    /**
     * Lateral Isomorphic Pattern Transfer: When a student masters a pattern in one structure,
     * positive transfer ripples to isomorphic structures.
     */
    public static final Map<String, List<String>> LATERAL_TRANSFER_MAP = Map.ofEntries(
            Map.entry("TWO_POINTERS", List.of("LINKED_LISTS", "INTERVALS_GREEDY")),
            Map.entry("BFS_DFS", List.of("GRAPHS", "TREES_BST")),
            Map.entry("SLIDING_WINDOW", List.of("HASH_TABLES", "TWO_POINTERS")),
            Map.entry("MONOTONIC_QUEUE_STACK", List.of("TWO_POINTERS", "SLIDING_WINDOW")),
            Map.entry("BINARY_SEARCH", List.of("INTERVALS_GREEDY"))
    );

    // =========================================================================
    // MATHEMATICAL WEIGHTS & THRESHOLDS FOR DAG PROPAGATION
    // =========================================================================
    public static final double PREREQUISITE_GATING_THRESHOLD = 0.35; // Below 35% mastery, child mastery is capped
    public static final double DIRECT_TARGET_WEIGHT = 1.00;          // 100% direct target impact
    public static final double PATTERN_TO_CONCEPT_WEIGHT = 0.45;     // 45% pattern-to-concept impact
    public static final double REMEDIATION_PENALTY_WEIGHT = 0.30;    // 30% top-down diagnostic remediation
    public static final double LATERAL_TRANSFER_WEIGHT = 0.25;       // 25% lateral isomorphic transfer

    // =========================================================================
    // BACKWARD COMPATIBILITY ALIASES (Preserving Legacy 35-D Data)
    // =========================================================================
    public static final List<String> CONCEPTS = List.of(
            "ARRAYS", "STRINGS", "HASHING", "LINKED_LISTS",
            "STACKS", "QUEUES", "TREES", "GRAPHS",
            "GREEDY", "BACKTRACKING", "DYNAMIC_PROGRAMMING", "BINARY_SEARCH"
    );

    public static final List<String> PATTERNS = List.of(
            "TWO_POINTERS", "SLIDING_WINDOW", "PREFIX_SUM",
            "BINARY_SEARCH_PATTERN", "DFS", "BFS",
            "MONOTONIC_STACK", "HEAP", "UNION_FIND"
    );

    public static final List<String> CODING_COMPETENCIES = List.of(
            "IMPLEMENTATION", "DEBUGGING", "COMPLEXITY_REASONING",
            "EDGE_CASE_HANDLING", "CODE_ORGANIZATION"
    );

    public static final List<String> ERROR_PROFILES = List.of(
            "OFF_BY_ONE", "BOUNDARY_CONDITION", "INCORRECT_POINTER_UPDATE",
            "NULL_EMPTY_HANDLING", "WRONG_RECURRENCE", "INCORRECT_STATE_TRANSITION",
            "TLE", "MLE", "COMPILATION_SYNTAX_ERROR"
    );

    public static final Map<String, List<String>> CONCEPT_TO_PATTERNS = Map.ofEntries(
            Map.entry("ARRAYS", List.of("TWO_POINTERS", "SLIDING_WINDOW", "PREFIX_SUM", "BINARY_SEARCH_PATTERN")),
            Map.entry("STRINGS", List.of("TWO_POINTERS", "SLIDING_WINDOW", "PREFIX_SUM")),
            Map.entry("HASHING", List.of("PREFIX_SUM", "SLIDING_WINDOW", "TWO_POINTERS")),
            Map.entry("LINKED_LISTS", List.of("TWO_POINTERS")),
            Map.entry("STACKS", List.of("MONOTONIC_STACK")),
            Map.entry("QUEUES", List.of("BFS")),
            Map.entry("TREES", List.of("DFS", "BFS", "HEAP")),
            Map.entry("GRAPHS", List.of("DFS", "BFS", "UNION_FIND")),
            Map.entry("GREEDY", List.of("HEAP", "TWO_POINTERS")),
            Map.entry("BACKTRACKING", List.of("DFS")),
            Map.entry("DYNAMIC_PROGRAMMING", List.of("PREFIX_SUM")),
            Map.entry("BINARY_SEARCH", List.of("BINARY_SEARCH_PATTERN", "TWO_POINTERS"))
    );

    public static final Map<String, List<String>> PATTERN_TO_CONCEPTS = Map.ofEntries(
            Map.entry("TWO_POINTERS", List.of("ARRAYS", "STRINGS", "LINKED_LISTS", "BINARY_SEARCH", "GREEDY")),
            Map.entry("SLIDING_WINDOW", List.of("ARRAYS", "STRINGS", "HASHING")),
            Map.entry("PREFIX_SUM", List.of("ARRAYS", "STRINGS", "HASHING", "DYNAMIC_PROGRAMMING")),
            Map.entry("BINARY_SEARCH_PATTERN", List.of("BINARY_SEARCH", "ARRAYS")),
            Map.entry("DFS", List.of("TREES", "GRAPHS", "BACKTRACKING")),
            Map.entry("BFS", List.of("QUEUES", "GRAPHS", "TREES")),
            Map.entry("MONOTONIC_STACK", List.of("STACKS", "ARRAYS")),
            Map.entry("HEAP", List.of("TREES", "GREEDY", "QUEUES")),
            Map.entry("UNION_FIND", List.of("GRAPHS", "TREES"))
    );

    public static final Map<String, List<String>> CONCEPT_GRAPH_NEIGHBORS = Map.ofEntries(
            Map.entry("ARRAYS", List.of("STRINGS", "HASHING", "BINARY_SEARCH", "LINKED_LISTS")),
            Map.entry("STRINGS", List.of("ARRAYS", "HASHING", "STACKS")),
            Map.entry("HASHING", List.of("ARRAYS", "STRINGS", "TREES")),
            Map.entry("LINKED_LISTS", List.of("ARRAYS", "STACKS", "QUEUES")),
            Map.entry("STACKS", List.of("QUEUES", "LINKED_LISTS", "TREES", "BACKTRACKING")),
            Map.entry("QUEUES", List.of("STACKS", "GRAPHS", "TREES")),
            Map.entry("TREES", List.of("GRAPHS", "STACKS", "QUEUES", "DYNAMIC_PROGRAMMING")),
            Map.entry("GRAPHS", List.of("TREES", "QUEUES", "DYNAMIC_PROGRAMMING", "GREEDY")),
            Map.entry("GREEDY", List.of("DYNAMIC_PROGRAMMING", "GRAPHS", "ARRAYS")),
            Map.entry("BACKTRACKING", List.of("TREES", "GRAPHS", "DYNAMIC_PROGRAMMING")),
            Map.entry("DYNAMIC_PROGRAMMING", List.of("GREEDY", "BACKTRACKING", "TREES", "ARRAYS")),
            Map.entry("BINARY_SEARCH", List.of("ARRAYS", "STRINGS", "GREEDY"))
    );

    public static final double PRIMARY_SKILL_WEIGHT = 1.00;
    public static final double QUESTION_PATTERN_WEIGHT = 0.50;
    public static final double LINKED_PATTERN_WEIGHT = 0.35;
    public static final double GRAPH_NEIGHBOR_WEIGHT = 0.18;

    // Normalizes legacy or raw dimension names into clean 20-D Matrix keys
    public static String normalizeDimension(String raw) {
        if (raw == null) return "ARRAYS_STRINGS";
        String s = raw.trim().toUpperCase();
        return switch (s) {
            case "ARRAYS", "STRINGS", "ARRAYS_STRINGS" -> "ARRAYS_STRINGS";
            case "HASHING", "HASH_TABLES" -> "HASH_TABLES";
            case "LINKED_LISTS" -> "LINKED_LISTS";
            case "STACKS", "QUEUES", "STACKS_QUEUES" -> "STACKS_QUEUES";
            case "TREES", "TREES_BST" -> "TREES_BST";
            case "GRAPHS" -> "GRAPHS";
            case "BACKTRACKING", "RECURSION", "RECURSION_BACKTRACKING" -> "RECURSION_BACKTRACKING";
            case "DYNAMIC_PROGRAMMING" -> "DYNAMIC_PROGRAMMING";
            case "BINARY_SEARCH_PATTERN", "BINARY_SEARCH" -> "BINARY_SEARCH";
            case "DFS", "BFS", "BFS_DFS" -> "BFS_DFS";
            case "MONOTONIC_STACK", "MONOTONIC_QUEUE_STACK" -> "MONOTONIC_QUEUE_STACK";
            case "HEAP", "TOP_K_HEAP" -> "TOP_K_HEAP";
            case "UNION_FIND" -> "UNION_FIND";
            case "GREEDY", "INTERVALS_GREEDY" -> "INTERVALS_GREEDY";
            case "PREFIX_SUM" -> "ARRAYS_STRINGS";
            case "IMPLEMENTATION", "IMPLEMENTATION_FLUENCY" -> "IMPLEMENTATION_FLUENCY";
            case "DEBUGGING", "CODE_RELIABILITY" -> "CODE_RELIABILITY";
            case "COMPLEXITY_REASONING", "ALGORITHMIC_EFFICIENCY" -> "ALGORITHMIC_EFFICIENCY";
            case "EDGE_CASE_HANDLING", "EDGE_CASE_RESILIENCE" -> "EDGE_CASE_RESILIENCE";
            case "CODE_ORGANIZATION" -> "CODE_RELIABILITY";
            case "OFF_BY_ONE", "BOUNDARY_CONDITION" -> "OFF_BY_ONE";
            case "NULL_EMPTY_HANDLING", "NULL_EMPTY_COLLECTION" -> "NULL_EMPTY_COLLECTION";
            case "TLE", "TIME_LIMIT_EXCEEDED" -> "TIME_LIMIT_EXCEEDED";
            case "MLE", "WRONG_RECURRENCE", "INCORRECT_STATE_TRANSITION", "INCORRECT_POINTER_UPDATE", "STATE_CORRUPTION" -> "STATE_CORRUPTION";
            default -> s;
        };
    }

    // Rank Tiers & Thresholds (XP range 0 to 1000)
    public static final int MAX_RANK_XP = 1000;
    public static final int MILESTONE_SOLVED_QUOTA = 15;

    public static String calculateRankTier(int rankXp) {
        if (rankXp >= 950) return "OBSIDIAN";
        if (rankXp >= 850) return "DIAMOND";
        if (rankXp >= 700) return "PLATINUM";
        if (rankXp >= 450) return "GOLD";
        if (rankXp >= 200) return "SILVER";
        return "BRONZE";
    }

    public static int calculateRankXp(double mastery, int questionsSolved) {
        double competencyPortion = Math.max(0.0, Math.min(1.0, mastery)) * 600.0;
        double volumeRatio = Math.min(1.0, (double) Math.max(0, questionsSolved) / (double) MILESTONE_SOLVED_QUOTA);
        double volumePortion = volumeRatio * 400.0;
        return (int) Math.round(Math.min(MAX_RANK_XP, competencyPortion + volumePortion));
    }
}
