package com.example.ProctorX.Controller;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(
        origins = {
                "http://localhost:5173",
                "http://localhost:5174",
                 "http://localhost:5175",
                "https://proctor-x-frontend.vercel.app"
        },
        allowCredentials = "true"
)

public class AuthController {
    @Autowired
    AuthService authService;

    @Autowired
    AuthenticationManager authenticationManager;
    @PostMapping("/Register")
public ResponseEntity<?> register(@RequestBody AuthEntity authEntity) {

    authEntity.setRole(AuthEntity.Role.COORDINATOR);
    authEntity.setProvider(AuthEntity.Provider.LOCAL);
    authEntity.setApproved(false);

    authService.setUser(authEntity);

    return ResponseEntity.ok("Coordinator registration request sent");
}
    @PostMapping("/Login")
    public ResponseEntity<?> login(@RequestBody AuthEntity request,
                                   HttpServletRequest httpRequest) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        // Set authentication in security context
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Create session
        httpRequest.getSession(true);

        AuthEntity user = authService.findByEmail(request.getEmail());

        return ResponseEntity.ok(
                Map.of(
                        "email", user.getEmail(),
                        "role", user.getRole().name(),
                        "approved", user.getApproved()
                )
        );
    }
    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }

        String email;

        // GOOGLE LOGIN
        if (authentication.getPrincipal() instanceof OAuth2User oauthUser) {
            email = oauthUser.getAttribute("email");
        }
        // NORMAL LOGIN
        else {
            email = authentication.getName();
        }

        AuthEntity user = authService.findByEmail(email);

        if (user == null) {
            return ResponseEntity.status(404).body("User not found");
        }

        return ResponseEntity.ok(
                Map.of(
                        "email", user.getEmail(),
                        "role", user.getRole().name(),
                        "approved", user.getApproved()
                )
        );
    }
    @GetMapping("/admin/users")
    public List<AuthEntity> getUsers() {
        return authService.getUsers();
    }
    @PutMapping("/admin/approve/{id}")
    public ResponseEntity<?> approveUser(@PathVariable Long id) {

//        AuthEntity user = authRepository.findById(id)
//                .orElseThrow();
//
//        user.setApproved(true);
//
//        authRepository.save(user);
        authService.setApproval(id);

        return ResponseEntity.ok("User approved");
    }








}
