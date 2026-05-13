package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/sonsonha/eng-noting/internal/domain"
	"github.com/sonsonha/eng-noting/internal/usecase"
)

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterResponse struct {
	UserID string `json:"user_id"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type RefreshTokenResponse struct {
	RefreshToken string `json:"refresh_token"`
	AccessToken  string `json:"access_token"`
	ExpiresIn    int    `json:"expires_in"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "missing required fields")
		return
	}

	output, err := h.authUseCase.Register(ctx, usecase.RegisterInput{Email: req.Email, Password: req.Password})
	if err != nil {
		if errors.Is(err, domain.ErrEmailAlreadyExists) {
			writeError(w, http.StatusConflict, "email already exists")
			return
		}
		if errors.Is(err, domain.ErrBadRequest) {
			writeError(w, http.StatusBadRequest, "bad request")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to register user")
		return
	}

	resp := RegisterResponse{UserID: output.UserID}
	writeJSON(w, http.StatusCreated, resp)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "missing required fields")
		return
	}

	input := usecase.LoginInput{Email: req.Email, Password: req.Password}
	output, err := h.authUseCase.Login(ctx, input)
	if err != nil {
		if errors.Is(err, domain.ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to login user")
		return
	}

	resp := LoginResponse{AccessToken: output.AccessToken, RefreshToken: output.RefreshToken}
	cookie := &http.Cookie{
		Name:     "refresh_token",
		Value:    output.RefreshToken,
		HttpOnly: true,
		Secure:   true,
		// SameSite: http.SameSiteLax,
	}
	http.SetCookie(w, cookie)
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	req := RefreshTokenRequest{RefreshToken: cookie.Value}
	output, err := h.authUseCase.RefreshToken(ctx, usecase.RefreshTokenInput{RefreshToken: req.RefreshToken})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to refresh token")
		return
	}
	writeJSON(w, http.StatusOK, output)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req usecase.RefreshTokenInput
	// httpOnly cookie
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	req.RefreshToken = cookie.Value

	if err := h.authUseCase.Logout(ctx, req); err != nil {
		writeError(w, http.StatusInternalServerError, "Unauthorized")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
