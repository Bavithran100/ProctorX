package com.example.ProctorX.Config;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Repository.AuthRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final AuthRepository authRepository;

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

            AuthEntity newUser = AuthEntity.builder()
                    .name(name)
                    .email(email)
                    .role(AuthEntity.Role.STUDENT)
                    .provider(AuthEntity.Provider.GOOGLE)
                    .password(null)
                    .approved(false)
                    .enabled(true)
                    .build();

            authRepository.save(newUser);
        }

        // Redirect to React login page
        response.sendRedirect("http://localhost:5173/login?oauth=true");
    }
}