package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/sonsonha/eng-noting/internal/domain"
	"github.com/sonsonha/eng-noting/internal/usecase"
)

// AdminUseCaser defines admin operations needed by the HTTP layer.
type AdminUseCaser interface {
	CheckIsAdmin(ctx context.Context, userID string) (bool, error)
	ListUsers(ctx context.Context) (*usecase.ListUsersOutput, error)
	ToggleAdmin(ctx context.Context, input usecase.ToggleAdminInput) error
	GetStats(ctx context.Context) (*usecase.AdminStatsOutput, error)
}

// AdminMiddleware rejects non-admin users with 403.
func (h *Handler) AdminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := mustUserIDFromContext(r.Context())
		isAdmin, err := h.adminUseCase.CheckIsAdmin(r.Context(), userID)
		if err != nil || !isAdmin {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// AdminListUsers returns all users with stats.
func (h *Handler) AdminListUsers(w http.ResponseWriter, r *http.Request) {
	output, err := h.adminUseCase.ListUsers(r.Context())
	if err != nil {
		h.logger.Error("admin list users failed", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to list users")
		return
	}
	writeJSON(w, http.StatusOK, output)
}

type toggleAdminRequest struct {
	IsAdmin bool `json:"is_admin"`
}

// AdminToggleAdmin sets or removes admin status for a target user.
func (h *Handler) AdminToggleAdmin(w http.ResponseWriter, r *http.Request) {
	requesterID := mustUserIDFromContext(r.Context())
	targetID := chi.URLParam(r, "id")

	var req toggleAdminRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	err := h.adminUseCase.ToggleAdmin(r.Context(), usecase.ToggleAdminInput{
		RequesterID: requesterID,
		TargetID:    targetID,
		IsAdmin:     req.IsAdmin,
	})
	if err != nil {
		if errors.Is(err, domain.ErrForbidden) {
			writeError(w, http.StatusForbidden, "cannot remove your own admin status")
			return
		}
		h.logger.Error("admin toggle failed", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to update admin status")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// AdminGetStats returns aggregated dashboard stats.
func (h *Handler) AdminGetStats(w http.ResponseWriter, r *http.Request) {
	output, err := h.adminUseCase.GetStats(r.Context())
	if err != nil {
		h.logger.Error("admin get stats failed", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to get stats")
		return
	}
	writeJSON(w, http.StatusOK, output)
}
