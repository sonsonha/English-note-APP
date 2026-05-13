package http

import (
	"net/http"
	"net/http/httptest"
	"testing"

	authinfra "github.com/sonsonha/eng-noting/internal/infrastructure/auth"
)

const testUserID = "550e8400-e29b-41d4-a716-446655440000"

func TestAuthMiddleware(t *testing.T) {
	jwtService := authinfra.NewJwtService("test-secret", 60, 1440, "access", 1)
	validToken, err := jwtService.GenerateAccessToken(testUserID, "test-family")
	if err != nil {
		t.Fatalf("failed to generate valid token: %v", err)
	}

	// A simple next handler that records the user ID it received.
	makeNext := func(capturedUserID *string) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			uid, _ := r.Context().Value(userIDKey).(string)
			if capturedUserID != nil {
				*capturedUserID = uid
			}
			w.WriteHeader(http.StatusOK)
		})
	}

	tests := []struct {
		name           string
		authHeader     string
		wantStatus     int
		wantNextCalled bool
		wantUserID     string
	}{
		{
			name:           "missing Authorization header returns 401",
			authHeader:     "",
			wantStatus:     http.StatusUnauthorized,
			wantNextCalled: false,
		},
		{
			name:           "wrong scheme (Token instead of Bearer) returns 401",
			authHeader:     "Token " + validToken,
			wantStatus:     http.StatusUnauthorized,
			wantNextCalled: false,
		},
		{
			name:           "header with only one part (no space) returns 401",
			authHeader:     "Bearer",
			wantStatus:     http.StatusUnauthorized,
			wantNextCalled: false,
		},
		{
			name:           "Bearer with empty token returns 401",
			authHeader:     "Bearer ",
			wantStatus:     http.StatusUnauthorized,
			wantNextCalled: false,
		},
		{
			name:           "Bearer with malformed token returns 401",
			authHeader:     "Bearer not-a-uuid",
			wantStatus:     http.StatusUnauthorized,
			wantNextCalled: false,
		},
		{
			name:           "Bearer with invalid token returns 401",
			authHeader:     "Bearer 12345",
			wantStatus:     http.StatusUnauthorized,
			wantNextCalled: false,
		},
		{
			name:           "valid Bearer JWT calls next handler with user ID in context",
			authHeader:     "Bearer " + validToken,
			wantStatus:     http.StatusOK,
			wantNextCalled: true,
			wantUserID:     testUserID,
		},
		{
			name:           "header with extra spaces between parts returns 401 (more than 2 parts)",
			authHeader:     "Bearer " + testUserID + " extra",
			wantStatus:     http.StatusUnauthorized,
			wantNextCalled: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var capturedUserID string
			handler := AuthMiddleware(makeNext(&capturedUserID), jwtService)

			req := httptest.NewRequest(http.MethodGet, "/", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}
			w := httptest.NewRecorder()

			handler.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", w.Code, tt.wantStatus)
			}

			if tt.wantNextCalled && capturedUserID != tt.wantUserID {
				t.Errorf("user ID in context = %q, want %q", capturedUserID, tt.wantUserID)
			}
			if !tt.wantNextCalled && capturedUserID != "" {
				t.Errorf("next handler should not have been called, but got user ID %q", capturedUserID)
			}
		})
	}
}

func TestAuthMiddleware_ResponseContentType(t *testing.T) {
	jwtService := authinfra.NewJwtService("test-secret", 60, 1440, "access", 1)
	handler := AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}), jwtService)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("Content-Type = %q, want %q", ct, "application/json")
	}
}
