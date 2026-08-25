package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.AuthEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuthRepository  extends JpaRepository<AuthEntity,Long> {
    AuthEntity findByEmail(String name);


}
