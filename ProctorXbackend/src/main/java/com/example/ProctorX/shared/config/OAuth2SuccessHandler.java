package com.example.ProctorX.Config;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Repository.AuthRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final AuthRepository authRepository;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public OAuth2SuccessHandler(AuthRepository authRepository) {
        this.authRepository = authRepository;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {

        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();

        String email = oauthUser.getAttribute("email");
        String name = oauthUser.getAttribute("name");

        AuthEntity user = authRepository.findByEmail(email);

        if (user == null) {
            String base = email.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "");
            String username = base;
            int counter = 1;
            while (authRepository.existsByUsername(username)) {
                username = base + counter++;
            }

            AuthEntity newUser = AuthEntity.builder()
                    .name(name != null ? name : base)
                    .email(email)
                    .username(username)
                    .role(AuthEntity.Role.STUDENT)
                    .provider(AuthEntity.Provider.GOOGLE)
                    .password(null)
                    .approved(false) // Requires admin approval
                    .profileCompleted(false)
                    .enabled(true)
                    .build();

            authRepository.save(newUser);
        }

        // Clean trailing slash from frontendUrl if present
        String targetBase = frontendUrl != null ? frontendUrl.replaceAll("/+$", "") : "http://localhost:5173";
        response.sendRedirect(targetBase + "/login?oauth=true");
    }
}