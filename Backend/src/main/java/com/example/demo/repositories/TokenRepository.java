package com.example.demo.repositories;

import com.example.demo.models.Token;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TokenRepository extends JpaRepository<Token, String> {

    Optional<Token> findByToken(String token);

    @Query("SELECT t FROM Token t WHERE t.user.id = :userId AND t.validatedAt IS NULL ORDER BY t.createdAt DESC")
    List<Token> findAllValidTokensByUser(String userId);

    @Query("SELECT t FROM Token t WHERE t.user.id = :userId AND (t.expiresAt > CURRENT_TIMESTAMP OR t.validatedAt IS NULL)")
    List<Token> findAllActiveTokensByUser(String userId);
}
