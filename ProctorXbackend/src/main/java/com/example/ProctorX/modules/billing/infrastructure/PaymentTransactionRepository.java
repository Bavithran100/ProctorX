package com.example.ProctorX.modules.billing.infrastructure;

import com.example.ProctorX.modules.billing.domain.PaymentTransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransactionEntity, Long> {
    Optional<PaymentTransactionEntity> findByTransactionId(String transactionId);
    List<PaymentTransactionEntity> findByCollegeAdminEmailOrderByCreatedAtDesc(String collegeAdminEmail);
}
