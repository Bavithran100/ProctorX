package com.example.ProctorX.modules.adaptive.domain;

import java.util.List;
import java.util.Map;

public class AdaptiveConstants {

    // 1. 12 Core Concepts
    public static final List<String> CONCEPTS = List.of(
            "ARRAYS",
            "STRINGS",
            "HASHING",
            "LINKED_LISTS",
            "STACKS",
            "QUEUES",
            "TREES",
            "GRAPHS",
            "GREEDY",
            "BACKTRACKING",
            "DYNAMIC_PROGRAMMING",
            "BINARY_SEARCH"
    );

    // 2. 9 Algorithmic Patterns
    public static final List<String> PATTERNS = List.of(
            "TWO_POINTERS",
            "SLIDING_WINDOW",
            "PREFIX_SUM",
            "BINARY_SEARCH_PATTERN",
            "DFS",
            "BFS",
            "MONOTONIC_STACK",
            "HEAP",
            "UNION_FIND"
    );

    // 3. 5 Engineering & Cognitive Competencies
    public static final List<String> CODING_COMPETENCIES = List.of(
            "IMPLEMENTATION",
            "DEBUGGING",
            "COMPLEXITY_REASONING",
            "EDGE_CASE_HANDLING",
            "CODE_ORGANIZATION"
    );

    // 4. 9 Diagnostic Error Taxonomy Profiles
    public static final List<String> ERROR_PROFILES = List.of(
            "OFF_BY_ONE",
            "BOUNDARY_CONDITION",
            "INCORRECT_POINTER_UPDATE",
            "NULL_EMPTY_HANDLING",
            "WRONG_RECURRENCE",
            "INCORRECT_STATE_TRANSITION",
            "TLE",
            "MLE",
            "COMPILATION_SYNTAX_ERROR"
    );

    // 5. Bi-Directional Concept <-> Pattern Cross-Reflection Map
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

    // 6. Conceptual Knowledge Graph Adjacency Neighbors (for Tiered Multi-Hop Reflection)
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

    // Multi-Hop Reflection Decay Weights
    public static final double PRIMARY_SKILL_WEIGHT = 1.00;     // 100% direct target impact
    public static final double QUESTION_PATTERN_WEIGHT = 0.50;  // 50% explicit pattern impact
    public static final double LINKED_PATTERN_WEIGHT = 0.35;    // 35% linked pattern cross-reflection
    public static final double GRAPH_NEIGHBOR_WEIGHT = 0.18;    // 18% subtle adjacent concept ripple

    // Rank Tiers & Thresholds (XP range 0 to 1000)
    public static final int MAX_RANK_XP = 1000;
    public static final int MILESTONE_SOLVED_QUOTA = 15; // 15 questions solved for full volume credit

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
