package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.OrganizationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrganizationRepository extends JpaRepository<OrganizationEntity, Long> {
    Optional<OrganizationEntity> findByOrgCode(String orgCode);
    Optional<OrganizationEntity> findByNameIgnoreCase(String name);
    Optional<OrganizationEntity> findByCollegeAdminId(Long collegeAdminId);
    boolean existsByOrgCode(String orgCode);
    boolean existsByNameIgnoreCase(String name);
    List<OrganizationEntity> findByPaymentStatusAndIsLockedFalse(String paymentStatus);
    List<OrganizationEntity> findAllByOrderByCreatedAtDesc();
}
