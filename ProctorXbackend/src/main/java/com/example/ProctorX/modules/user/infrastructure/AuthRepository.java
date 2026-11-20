package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.AuthEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuthRepository extends JpaRepository<AuthEntity, Long> {
    AuthEntity findByEmail(String email);
    Optional<AuthEntity> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByUsernameIgnoreCase(String username);
    boolean existsByEmail(String email);

    @Query("SELECT u.username FROM AuthEntity u WHERE u.username IS NOT NULL")
    List<String> findAllUsernames();

    List<AuthEntity> findByRole(AuthEntity.Role role);

    AuthEntity findFirstByRoleAndOrganizationNameIgnoreCase(AuthEntity.Role role, String organizationName);

    long countByCollegeAdminIdAndRole(Long collegeAdminId, AuthEntity.Role role);

    List<AuthEntity> findByCollegeAdminId(Long collegeAdminId);

    List<AuthEntity> findByOrganizationId(Long organizationId);
    List<AuthEntity> findByOrgCode(String orgCode);
    List<AuthEntity> findByCoordinatorId(Long coordinatorId);
    List<AuthEntity> findByCoordinatorIdAndRole(Long coordinatorId, AuthEntity.Role role);
    List<AuthEntity> findByOrganizationIdAndRole(Long organizationId, AuthEntity.Role role);
    List<AuthEntity> findByCollegeAdminIdAndRole(Long collegeAdminId, AuthEntity.Role role);
    long countByCoordinatorIdAndRole(Long coordinatorId, AuthEntity.Role role);
    long countByOrganizationIdAndRole(Long organizationId, AuthEntity.Role role);
    void deleteByOrganizationId(Long organizationId);
    void deleteByCollegeAdminId(Long collegeAdminId);

    @Query("SELECT DISTINCT u.organizationName FROM AuthEntity u WHERE u.organizationName IS NOT NULL AND TRIM(u.organizationName) != ''")
    List<String> findDistinctOrganizationNames();
}
