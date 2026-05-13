package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/sonsonha/eng-noting/internal/domain"
	"github.com/sonsonha/eng-noting/internal/usecase"
)

type SubmitReviewRequest struct {
	SessionID  string `json:"session_id"`
	WordID     string `json:"word_id"`
	Result     bool   `json:"result"`
	ReviewType string `json:"review_type"`
}

type SubmitReviewResponse struct {
	Success bool `json:"success"`
}

var validReviewTypes = map[string]bool{
	"mcq":        true,
	"match":      true,
	"typing":     true,
	"fill_blank": true,
}

func (h *Handler) SubmitReview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := mustUserIDFromContext(ctx)

	var req SubmitReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	if req.SessionID == "" || req.WordID == "" || req.ReviewType == "" {
		writeError(w, http.StatusBadRequest, "missing required fields")
		return
	}

	if !validReviewTypes[req.ReviewType] {
		writeError(w, http.StatusBadRequest, "invalid review_type")
		return
	}

	output, errResp, err := h.submitCurrentReview(ctx, userID, req)
	if errResp != nil {
		writeError(w, errResp.status, errResp.message)
		return
	}
	if err != nil {
		if errors.Is(err, domain.ErrWordNotFound) {
			writeError(w, http.StatusNotFound, "word not found")
			return
		}
		if errors.Is(err, usecase.ErrForbidden) {
			writeError(w, http.StatusForbidden, "word does not belong to user")
			return
		}
		h.logger.Error("failed to submit review", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to process review")
		return
	}

	writeJSON(w, http.StatusOK, SubmitReviewResponse{Success: output.Success})
}

type StartSessionResponse struct {
	SessionID string        `json:"session_id"`
	Items     []SessionItem `json:"items"`
	Total     int           `json:"total"`
}

type SessionItem struct {
	WordID        string        `json:"word_id"`
	WordText      string        `json:"word_text"`
	ReviewType    string        `json:"review_type"`
	PriorityScore float64       `json:"priority_score"`
	Reason        string        `json:"reason"`
	Quiz          *QuizResponse `json:"quiz"` // null means quiz not yet generated
}

func domainQuizToResponse(q *domain.WordQuiz) *QuizResponse {
	if q == nil {
		return nil
	}
	choices := q.Choices
	if choices == nil {
		choices = []string{}
	}
	return &QuizResponse{
		QuizType:    q.QuizType,
		Question:    q.Question,
		Choices:     choices,
		Answer:      q.Answer,
		GeneratedAt: q.GeneratedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func domainItemToSessionItem(item domain.SessionItem) SessionItem {
	return SessionItem{
		WordID:        item.WordID,
		WordText:      item.WordText,
		ReviewType:    item.ReviewType,
		PriorityScore: item.PriorityScore,
		Reason:        item.Reason,
		Quiz:          domainQuizToResponse(item.Quiz),
	}
}

type startSessionRequest struct {
	Limit int    `json:"limit"`
	From  string `json:"from"` // YYYY-MM-DD, optional
	To    string `json:"to"`   // YYYY-MM-DD, optional
}

func (h *Handler) StartSession(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := mustUserIDFromContext(ctx)

	var req startSessionRequest
	_ = json.NewDecoder(r.Body).Decode(&req) // body is optional

	input := usecase.StartSessionInput{UserID: userID, Limit: req.Limit}
	if req.From != "" && req.To != "" {
		from, errF := time.Parse(time.DateOnly, req.From)
		to, errT := time.Parse(time.DateOnly, req.To)
		if errF == nil && errT == nil {
			input.From = &from
			input.To = &to
		}
	}

	output, err := h.sessionUseCase.StartSession(ctx, input)
	if err != nil {
		h.logger.Error("failed to start session", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}

	items := make([]SessionItem, len(output.Items))
	for i, item := range output.Items {
		items[i] = domainItemToSessionItem(item)
	}

	sessionID := uuid.NewString()
	session := &domain.Session{
		UserID: userID,
		Items:  output.Items,
		Index:  0,
	}

	h.sessionMu.Lock()
	h.sessionStore[sessionID] = sessionEntry{
		session:   session,
		expiresAt: time.Now().Add(sessionTTL),
	}
	h.sessionMu.Unlock()

	writeJSON(w, http.StatusOK, StartSessionResponse{
		SessionID: sessionID,
		Items:     items,
		Total:     output.Total,
	})
}

type sessionError struct {
	status  int
	message string
}

// sessionEntryLocked looks up a session by ID, enforces TTL and ownership.
// h.sessionMu must be held by the caller.
func (h *Handler) sessionEntryLocked(sessionID, userID string) (sessionEntry, *sessionError) {
	entry, exists := h.sessionStore[sessionID]

	if !exists {
		return sessionEntry{}, &sessionError{status: http.StatusNotFound, message: "session not found"}
	}

	if time.Now().After(entry.expiresAt) {
		delete(h.sessionStore, sessionID)
		return sessionEntry{}, &sessionError{status: http.StatusNotFound, message: "session not found"}
	}

	if entry.session.UserID != userID {
		return sessionEntry{}, &sessionError{status: http.StatusForbidden, message: "session does not belong to user"}
	}

	return entry, nil
}

func (h *Handler) getCurrentSessionItem(sessionID, userID string) (domain.SessionItem, bool, *sessionError) {
	h.sessionMu.Lock()
	defer h.sessionMu.Unlock()

	entry, errResp := h.sessionEntryLocked(sessionID, userID)
	if errResp != nil {
		return domain.SessionItem{}, false, errResp
	}

	item := entry.session.Current()
	if item == nil {
		return domain.SessionItem{}, true, nil
	}

	return *item, false, nil
}

func (h *Handler) advanceSession(sessionID, userID string) (bool, *sessionError) {
	h.sessionMu.Lock()
	defer h.sessionMu.Unlock()

	entry, errResp := h.sessionEntryLocked(sessionID, userID)
	if errResp != nil {
		return false, errResp
	}

	entry.session.Advance()
	return entry.session.Done(), nil
}

func (h *Handler) submitCurrentReview(ctx context.Context, userID string, req SubmitReviewRequest) (*usecase.SubmitReviewOutput, *sessionError, error) {
	h.sessionMu.Lock()
	defer h.sessionMu.Unlock()

	entry, errResp := h.sessionEntryLocked(req.SessionID, userID)
	if errResp != nil {
		return nil, errResp, nil
	}

	current := entry.session.Current()
	if current == nil {
		return nil, &sessionError{status: http.StatusConflict, message: "session already completed"}, nil
	}

	if current.WordID != req.WordID || current.ReviewType != req.ReviewType {
		return nil, &sessionError{status: http.StatusConflict, message: "submitted review does not match current session item"}, nil
	}

	output, err := h.reviewUseCase.SubmitReview(ctx, usecase.SubmitReviewInput{
		UserID:     userID,
		WordID:     req.WordID,
		Result:     req.Result,
		ReviewType: req.ReviewType,
	})
	if err != nil {
		return nil, nil, err
	}

	entry.session.Advance()
	return output, nil, nil
}

// GetCurrentItem returns the current item in the session.
func (h *Handler) GetCurrentItem(w http.ResponseWriter, r *http.Request) {
	userID := mustUserIDFromContext(r.Context())

	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		writeError(w, http.StatusBadRequest, "missing session_id")
		return
	}

	item, done, errResp := h.getCurrentSessionItem(sessionID, userID)
	if errResp != nil {
		writeError(w, errResp.status, errResp.message)
		return
	}

	if done {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"done": true,
		})
		return
	}

	writeJSON(w, http.StatusOK, domainItemToSessionItem(item))
}

type AdvanceSessionRequest struct {
	SessionID string `json:"session_id"`
}

type AdvanceSessionResponse struct {
	Success bool `json:"success"`
	Done    bool `json:"done"`
}

// AdvanceSession skips the current item without recording a review.
func (h *Handler) AdvanceSession(w http.ResponseWriter, r *http.Request) {
	userID := mustUserIDFromContext(r.Context())

	var req AdvanceSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	if req.SessionID == "" {
		writeError(w, http.StatusBadRequest, "missing session_id")
		return
	}

	done, errResp := h.advanceSession(req.SessionID, userID)
	if errResp != nil {
		writeError(w, errResp.status, errResp.message)
		return
	}

	writeJSON(w, http.StatusOK, AdvanceSessionResponse{
		Success: true,
		Done:    done,
	})
}
