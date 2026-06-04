package com.example.demo.servicesImpl;

import com.example.demo.models.Token;
import com.example.demo.repositories.TokenRepository;
import com.example.demo.security.KeyUtils;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.PrivateKey;
import java.security.PublicKey;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class JWTService {
    public static final String TOKEN_TYPE = "token_type";
    private final PrivateKey privateKey;
    private final PublicKey publicKey;
    private final TokenRepository tokenRepository;
    @Value("${app.security.jwt.access-token-expiration}")
    private long accessTokenExpiration;
    @Value("${app.security.jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    public JWTService(TokenRepository tokenRepository) throws Exception {
        this.tokenRepository = tokenRepository;
        this.privateKey = KeyUtils.loadPrivateKey("keys/local-only/private_key.pem");
        this.publicKey = KeyUtils.loadPublicKey("keys/local-only/public_key.pem");
    }

    public String generateAccessToken(final String username) {
        final Map<String, Object> claims = Map.of(TOKEN_TYPE, "ACCESS_TOKEN");
        return buildToken(username, claims, this.accessTokenExpiration);
    }

    public String generateRefreshToken(final String username) {
        final Map<String, Object> claims = Map.of(TOKEN_TYPE, "REFRESH_TOKEN");
        return buildToken(username, claims, this.refreshTokenExpiration);
    }

    public String buildToken(final String username, final Map<String, Object> claims, final long expiration) {
        return Jwts.builder()
                .claims(claims)
                .subject(username)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(this.privateKey)
                .compact();
    }

    public boolean isTokenValid(final String token, final String expectedUsername) {
        final String username = extractUsername(token);
        return username.equals(expectedUsername) && !isTokenExpired(token) && isTokenPersistedAndActive(token);
    }

    public String extractUsername(final String token) {
        return extractClaims(token).getSubject();
    }

    private boolean isTokenExpired(final String token) {
        return extractClaims(token).getExpiration()
                .before(new Date());
    }

    private Claims extractClaims(final String token) {
        try {
            return Jwts.parser()
                    .verifyWith(this.publicKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (final JwtException e) {
            throw new RuntimeException("Invalid token", e);
        }
    }

    public String refreshAccessToken(final String refreshToken) {
        if (!isTokenPersistedAndActive(refreshToken)) {
            throw new RuntimeException("Refresh token is not active");
        }

        final Claims claims = extractClaims(refreshToken);

        if (!"REFRESH_TOKEN".equals(claims.get(TOKEN_TYPE, String.class))) {
            throw new RuntimeException("Invalid token type");
        }
        if (claims.getExpiration().before(new Date())) {
            throw new RuntimeException("Refresh token expired");
        }

        final String username = claims.getSubject();
        return generateAccessToken(username);
    }

    public void saveToken(String tokenValue, com.example.demo.models.User user, LocalDateTime expiresAt) {
        try {
            if (user == null) {
                log.error("Cannot save token: User is null");
                throw new IllegalArgumentException("User cannot be null when saving token");
            }
            if (user.getId() == null) {
                log.error("Cannot save token: User ID is missing for user: {}", user.getEmail());
                throw new IllegalArgumentException("User ID cannot be null when saving token");
            }
            if (tokenValue == null || tokenValue.isEmpty()) {
                log.error("Cannot save token: Token value is null or empty");
                throw new IllegalArgumentException("Token value cannot be null or empty");
            }

            Token token = Token.builder()
                    .token(tokenValue)
                    .user(user)
                    .expiresAt(expiresAt)
                    .build();
            Token savedToken = tokenRepository.save(token);
            log.info("Token saved successfully for user: {} (ID: {}) with token ID: {}",
                    user.getEmail(), user.getId(), savedToken.getId());
        } catch (Exception e) {
            log.error("Error saving token for user: {}", user != null ? user.getEmail() : "null", e);
            throw new RuntimeException("Failed to save token: " + e.getMessage(), e);
        }
    }

    public void revokeToken(String tokenValue) {
        Optional<Token> token = tokenRepository.findByToken(tokenValue);
        if (token.isPresent()) {
            tokenRepository.delete(token.get());
        }
    }

    public boolean isTokenRevoked(String tokenValue) {
        return tokenRepository.findByToken(tokenValue).isEmpty();
    }

    public void validateToken(String tokenValue) {
        Optional<Token> token = tokenRepository.findByToken(tokenValue);
        if (token.isPresent()) {
            Token t = token.get();
            t.setValidatedAt(LocalDateTime.now());
            tokenRepository.save(t);
        }
    }

    private boolean isTokenPersistedAndActive(String tokenValue) {
        return tokenRepository.findByToken(tokenValue)
                .filter(token -> !token.isExpired())
                .isPresent();
    }
}
