package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/sonsonha/eng-noting/internal/domain"
	"github.com/sonsonha/eng-noting/internal/usecase"
)

// mockReviewUseCase implements ReviewUseCaser.
type mockReviewUseCase struct {
	submitReviewFn func(ctx context.Context, input usecase.SubmitReviewInput) (*usecase.SubmitReviewOutput, error)
}

func (m *mockReviewUseCase) SubmitReview(ctx context.Context, input usecase.SubmitReviewInput) (*usecase.SubmitReviewOutput, error) {
	if m.submitReviewFn != nil {
		return m.submitReviewFn(ctx, input)
	}
	return &usecase.SubmitReviewOutput{Success: true}, nil
}

// mockAuthUseCase implements AuthUseCaser.
type mockAuthUseCase struct {
	registerFn func(ctx context.Context, input usecase.RegisterInput) (*usecase.RegisterOutput, error)
	loginFn    func(ctx context.Context, input usecase.LoginInput) (*usecase.LoginOutput, error)
	refreshFn  func(ctx context.Context, input usecase.RefreshTokenInput) (*usecase.RefreshTokenOutput, error)
	logoutFn   func(ctx context.Context, input usecase.RefreshTokenInput) error
	verifyFn   func(ctx context.Context, input usecase.VerifyRefreshTokenInput) (*usecase.VerifyRefreshTokenOutput, error)
}

func (m *mockAuthUseCase) Register(ctx context.Context, input usecase.RegisterInput) (*usecase.RegisterOutput, error) {
	if m.registerFn != nil {
		return m.registerFn(ctx, input)
	}
	return &usecase.RegisterOutput{UserID: "user-id"}, nil
}

func (m *mockAuthUseCase) Login(ctx context.Context, input usecase.LoginInput) (*usecase.LoginOutput, error) {
	if m.loginFn != nil {
		return m.loginFn(ctx, input)
	}
	return &usecase.LoginOutput{
		AccessToken:  "access-token",
		RefreshToken: "refresh-token",
	}, nil
}

func (m *mockAuthUseCase) RefreshToken(ctx context.Context, input usecase.RefreshTokenInput) (*usecase.RefreshTokenOutput, error) {
	if m.refreshFn != nil {
		return m.refreshFn(ctx, input)
	}
	return &usecase.RefreshTokenOutput{AccessToken: "access", RefreshToken: "refresh"}, nil
}

func (m *mockAuthUseCase) Logout(ctx context.Context, input usecase.RefreshTokenInput) error {
	if m.logoutFn != nil {
		return m.logoutFn(ctx, input)
	}
	return nil
}

func (m *mockAuthUseCase) VerifyRefreshToken(ctx context.Context, input usecase.VerifyRefreshTokenInput) (*usecase.VerifyRefreshTokenOutput, error) {
	if m.verifyFn != nil {
		return m.verifyFn(ctx, input)
	}
	return &usecase.VerifyRefreshTokenOutput{RefreshSession: &domain.RefreshSession{}}, nil
}

// mockSessionUseCase implements SessionUseCaser.
type mockSessionUseCase struct {
	startSessionFn func(ctx context.Context, input usecase.StartSessionInput) (*usecase.StartSessionOutput, error)
}

func (m *mockSessionUseCase) StartSession(ctx context.Context, input usecase.StartSessionInput) (*usecase.StartSessionOutput, error) {
	if m.startSessionFn != nil {
		return m.startSessionFn(ctx, input)
	}
	return &usecase.StartSessionOutput{Items: nil, Total: 0}, nil
}

type mockWordQuizUseCase struct{}

func (m *mockWordQuizUseCase) GetQuizzesByWordID(ctx context.Context, input usecase.GetQuizzesInput) (*usecase.GetQuizzesOutput, error) {
	return &usecase.GetQuizzesOutput{}, nil
}

// mockCalendarStatsUseCase implements CalendarStatsUseCaser.
type mockCalendarStatsUseCase struct {
	getStatsFn   func(ctx context.Context, input usecase.GetCalendarStatsInput) (*usecase.CalendarStatsOutput, error)
	getSummaryFn func(ctx context.Context, input usecase.CalendarSummaryStatsInput) (*usecase.CalendarSummaryStatsOutput, error)
}

func (m *mockCalendarStatsUseCase) GetCalendarStats(ctx context.Context, input usecase.GetCalendarStatsInput) (*usecase.CalendarStatsOutput, error) {
	if m.getStatsFn != nil {
		return m.getStatsFn(ctx, input)
	}
	return &usecase.CalendarStatsOutput{}, nil
}

func (m *mockCalendarStatsUseCase) GetCalendarSummaryStats(ctx context.Context, input usecase.CalendarSummaryStatsInput) (*usecase.CalendarSummaryStatsOutput, error) {
	if m.getSummaryFn != nil {
		return m.getSummaryFn(ctx, input)
	}
	return &usecase.CalendarSummaryStatsOutput{}, nil
}

func (m *mockCalendarStatsUseCase) BackfillDailyStats(ctx context.Context, input usecase.BackfillDailyStatsInput) error {
	return nil
}

// seedSession adds a session directly into handler's sessionStore for testing.
func seedSession(h *Handler, sessionID string, sess *domain.Session, expiresAt time.Time) {
	h.sessionMu.Lock()
	h.sessionStore[sessionID] = sessionEntry{session: sess, expiresAt: expiresAt}
	h.sessionMu.Unlock()
}

func makeTestSession(userID string, wordIDs []string) *domain.Session {
	items := make([]domain.SessionItem, len(wordIDs))
	for i, id := range wordIDs {
		items[i] = domain.SessionItem{WordID: id, ReviewType: "mcq", PriorityScore: 70}
	}
	return &domain.Session{UserID: userID, Items: items, Index: 0}
}

func makeTypedSession(userID string, items []domain.SessionItem) *domain.Session {
	return &domain.Session{UserID: userID, Items: items, Index: 0}
}

// TestHandler_SubmitReview tests the SubmitReview HTTP handler.
func TestHandler_SubmitReview(t *testing.T) {
	tests := []struct {
		name           string
		rawBody        string
		body           interface{}
		sessionID      string
		session        *domain.Session
		expiresAt      time.Time
		reviewFn       func(ctx context.Context, input usecase.SubmitReviewInput) (*usecase.SubmitReviewOutput, error)
		wantStatus     int
		wantAdvanced   bool
		wantReviewCall bool
	}{
		{
			name:       "invalid JSON body returns 400",
			rawBody:    `{bad json`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing session_id returns 400",
			body:       map[string]interface{}{"word_id": "w1", "result": true, "review_type": "mcq"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing word_id returns 400",
			body:       map[string]interface{}{"session_id": "sess-1", "result": true, "review_type": "mcq"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing review_type returns 400",
			body:       map[string]interface{}{"session_id": "sess-1", "word_id": "w1", "result": true},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid review_type returns 400",
			body:       map[string]interface{}{"session_id": "sess-1", "word_id": "w1", "result": true, "review_type": "essay"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "non-existent session_id returns 404",
			body:       map[string]interface{}{"session_id": "missing-session", "word_id": "w1", "result": true, "review_type": "mcq"},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "expired session returns 404",
			body:       map[string]interface{}{"session_id": "expired-session", "word_id": "w1", "result": true, "review_type": "mcq"},
			sessionID:  "expired-session",
			session:    makeTestSession(testUserID, []string{"w1"}),
			expiresAt:  time.Now().Add(-1 * time.Hour),
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "session owned by another user returns 403",
			body:       map[string]interface{}{"session_id": "other-session", "word_id": "w1", "result": true, "review_type": "mcq"},
			sessionID:  "other-session",
			session:    makeTestSession("other-user-id", []string{"w1"}),
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "completed session returns 409",
			body:       map[string]interface{}{"session_id": "done-session", "word_id": "w1", "result": true, "review_type": "mcq"},
			sessionID:  "done-session",
			session:    &domain.Session{UserID: testUserID, Items: []domain.SessionItem{{WordID: "w1", ReviewType: "mcq"}}, Index: 1},
			wantStatus: http.StatusConflict,
		},
		{
			name:       "word_id must match current session item",
			body:       map[string]interface{}{"session_id": "active-session", "word_id": "w2", "result": true, "review_type": "mcq"},
			sessionID:  "active-session",
			session:    makeTestSession(testUserID, []string{"w1", "w2"}),
			wantStatus: http.StatusConflict,
		},
		{
			name:       "review_type must match current session item",
			body:       map[string]interface{}{"session_id": "active-session", "word_id": "w1", "result": true, "review_type": "typing"},
			sessionID:  "active-session",
			session:    makeTestSession(testUserID, []string{"w1"}),
			wantStatus: http.StatusConflict,
		},
		{
			name:      "domain.ErrWordNotFound returns 404",
			body:      map[string]interface{}{"session_id": "active-session", "word_id": "w1", "result": true, "review_type": "mcq"},
			sessionID: "active-session",
			session:   makeTestSession(testUserID, []string{"w1"}),
			reviewFn: func(_ context.Context, _ usecase.SubmitReviewInput) (*usecase.SubmitReviewOutput, error) {
				return nil, domain.ErrWordNotFound
			},
			wantStatus:     http.StatusNotFound,
			wantReviewCall: true,
		},
		{
			name:      "usecase.ErrForbidden returns 403",
			body:      map[string]interface{}{"session_id": "active-session", "word_id": "w1", "result": true, "review_type": "mcq"},
			sessionID: "active-session",
			session:   makeTestSession(testUserID, []string{"w1"}),
			reviewFn: func(_ context.Context, _ usecase.SubmitReviewInput) (*usecase.SubmitReviewOutput, error) {
				return nil, usecase.ErrForbidden
			},
			wantStatus:     http.StatusForbidden,
			wantReviewCall: true,
		},
		{
			name:      "generic use case error returns 500",
			body:      map[string]interface{}{"session_id": "active-session", "word_id": "w1", "result": true, "review_type": "mcq"},
			sessionID: "active-session",
			session:   makeTestSession(testUserID, []string{"w1"}),
			reviewFn: func(_ context.Context, _ usecase.SubmitReviewInput) (*usecase.SubmitReviewOutput, error) {
				return nil, errors.New("db crash")
			},
			wantStatus:     http.StatusInternalServerError,
			wantReviewCall: true,
		},
		{
			name:      "happy path returns 200 with success=true",
			body:      map[string]interface{}{"session_id": "active-session", "word_id": "w1", "result": true, "review_type": "mcq"},
			sessionID: "active-session",
			session:   makeTestSession(testUserID, []string{"w1", "w2"}),
			reviewFn: func(_ context.Context, _ usecase.SubmitReviewInput) (*usecase.SubmitReviewOutput, error) {
				return &usecase.SubmitReviewOutput{Success: true}, nil
			},
			wantStatus:     http.StatusOK,
			wantAdvanced:   true,
			wantReviewCall: true,
		},
		{
			name:           "fill_blank review_type is valid when current item matches",
			body:           map[string]interface{}{"session_id": "active-session", "word_id": "w1", "result": false, "review_type": "fill_blank"},
			sessionID:      "active-session",
			session:        makeTypedSession(testUserID, []domain.SessionItem{{WordID: "w1", ReviewType: "fill_blank"}}),
			wantStatus:     http.StatusOK,
			wantAdvanced:   true,
			wantReviewCall: true,
		},
		{
			name:           "match review_type is valid when current item matches",
			body:           map[string]interface{}{"session_id": "active-session", "word_id": "w1", "result": false, "review_type": "match"},
			sessionID:      "active-session",
			session:        makeTypedSession(testUserID, []domain.SessionItem{{WordID: "w1", ReviewType: "match"}}),
			wantStatus:     http.StatusOK,
			wantAdvanced:   true,
			wantReviewCall: true,
		},
		{
			name:           "typing review_type is valid when current item matches",
			body:           map[string]interface{}{"session_id": "active-session", "word_id": "w1", "result": false, "review_type": "typing"},
			sessionID:      "active-session",
			session:        makeTypedSession(testUserID, []domain.SessionItem{{WordID: "w1", ReviewType: "typing"}}),
			wantStatus:     http.StatusOK,
			wantAdvanced:   true,
			wantReviewCall: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reviewCalled := false
			reviewFn := tt.reviewFn
			if reviewFn == nil {
				reviewFn = func(_ context.Context, _ usecase.SubmitReviewInput) (*usecase.SubmitReviewOutput, error) {
					return &usecase.SubmitReviewOutput{Success: true}, nil
				}
			}
			reviewUC := &mockReviewUseCase{
				submitReviewFn: func(ctx context.Context, input usecase.SubmitReviewInput) (*usecase.SubmitReviewOutput, error) {
					reviewCalled = true
					return reviewFn(ctx, input)
				},
			}
			h := NewHandler(&mockWordUseCase{}, reviewUC, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
			initialIndex := 0
			if tt.sessionID != "" {
				expiresAt := tt.expiresAt
				if expiresAt.IsZero() {
					expiresAt = time.Now().Add(sessionTTL)
				}
				if tt.session != nil {
					initialIndex = tt.session.Index
				}
				seedSession(h, tt.sessionID, tt.session, expiresAt)
			}

			var req *http.Request
			if tt.rawBody != "" {
				r := httptest.NewRequest(http.MethodPost, "/api/reviews/submit", strings.NewReader(tt.rawBody))
				ctx := context.WithValue(r.Context(), userIDKey, testUserID)
				req = r.WithContext(ctx)
			} else {
				req = authenticatedRequest(http.MethodPost, "/api/reviews/submit", tt.body)
			}

			w := httptest.NewRecorder()
			h.SubmitReview(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d (body: %s)", w.Code, tt.wantStatus, w.Body.String())
			}

			if tt.wantStatus == http.StatusOK {
				var resp SubmitReviewResponse
				if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}
				if !resp.Success {
					t.Error("expected Success=true")
				}
			}

			if reviewCalled != tt.wantReviewCall {
				t.Errorf("review use case called = %v, want %v", reviewCalled, tt.wantReviewCall)
			}

			if tt.sessionID != "" && tt.session != nil {
				h.sessionMu.RLock()
				entry, exists := h.sessionStore[tt.sessionID]
				h.sessionMu.RUnlock()
				if exists && tt.expiresAt.IsZero() {
					wantIndex := initialIndex
					if tt.wantAdvanced {
						wantIndex = initialIndex + 1
					}
					if entry.session.Index != wantIndex {
						t.Errorf("session.Index = %d, want %d", entry.session.Index, wantIndex)
					}
				}
			}
		})
	}
}

// TestHandler_StartSession tests the StartSession HTTP handler.
func TestHandler_StartSession(t *testing.T) {
	t.Run("use case error returns 500", func(t *testing.T) {
		sessionUC := &mockSessionUseCase{
			startSessionFn: func(_ context.Context, _ usecase.StartSessionInput) (*usecase.StartSessionOutput, error) {
				return nil, errors.New("session build failed")
			},
		}
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, sessionUC, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		req := authenticatedRequest(http.MethodPost, "/api/reviews/session", nil)
		w := httptest.NewRecorder()
		h.StartSession(w, req)

		if w.Code != http.StatusInternalServerError {
			t.Errorf("status = %d, want 500", w.Code)
		}
	})

	t.Run("happy path returns 200 with session_id items and total", func(t *testing.T) {
		sessionUC := &mockSessionUseCase{
			startSessionFn: func(_ context.Context, _ usecase.StartSessionInput) (*usecase.StartSessionOutput, error) {
				return &usecase.StartSessionOutput{
					Items: []domain.SessionItem{
						{WordID: "w1", ReviewType: "mcq", PriorityScore: 70},
						{WordID: "w2", ReviewType: "typing", PriorityScore: 50},
					},
					Total: 2,
				}, nil
			},
		}
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, sessionUC, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		req := authenticatedRequest(http.MethodPost, "/api/reviews/session", nil)
		w := httptest.NewRecorder()
		h.StartSession(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200 (body: %s)", w.Code, w.Body.String())
		}

		var resp StartSessionResponse
		if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if resp.SessionID == "" {
			t.Error("session_id should not be empty")
		}
		if len(resp.Items) != 2 {
			t.Errorf("items count = %d, want 2", len(resp.Items))
		}
		if resp.Total != 2 {
			t.Errorf("total = %d, want 2", resp.Total)
		}
	})

	t.Run("session is stored in handler session store", func(t *testing.T) {
		sessionUC := &mockSessionUseCase{
			startSessionFn: func(_ context.Context, _ usecase.StartSessionInput) (*usecase.StartSessionOutput, error) {
				return &usecase.StartSessionOutput{Items: []domain.SessionItem{{WordID: "w1", ReviewType: "mcq"}}, Total: 1}, nil
			},
		}
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, sessionUC, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		req := authenticatedRequest(http.MethodPost, "/api/reviews/session", nil)
		w := httptest.NewRecorder()
		h.StartSession(w, req)

		var resp StartSessionResponse
		_ = json.NewDecoder(w.Body).Decode(&resp)

		h.sessionMu.RLock()
		_, exists := h.sessionStore[resp.SessionID]
		h.sessionMu.RUnlock()

		if !exists {
			t.Errorf("session %q was not stored in sessionStore", resp.SessionID)
		}
	})
}

// TestHandler_GetCurrentItem tests the GetCurrentItem HTTP handler.
func TestHandler_GetCurrentItem(t *testing.T) {
	t.Run("missing session_id query param returns 400", func(t *testing.T) {
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		req := authenticatedRequest(http.MethodGet, "/api/reviews/session/current", nil)
		w := httptest.NewRecorder()
		h.GetCurrentItem(w, req)
		if w.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", w.Code)
		}
	})

	t.Run("non-existent session_id returns 404", func(t *testing.T) {
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		req := authenticatedRequest(http.MethodGet, "/api/reviews/session/current?session_id=does-not-exist", nil)
		w := httptest.NewRecorder()
		h.GetCurrentItem(w, req)
		if w.Code != http.StatusNotFound {
			t.Errorf("status = %d, want 404", w.Code)
		}
	})

	t.Run("expired session returns 404 and is removed from store", func(t *testing.T) {
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		sess := makeTestSession(testUserID, []string{"w1"})
		seedSession(h, "expired-session", sess, time.Now().Add(-1*time.Hour))

		req := authenticatedRequest(http.MethodGet, "/api/reviews/session/current?session_id=expired-session", nil)
		w := httptest.NewRecorder()
		h.GetCurrentItem(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("status = %d, want 404", w.Code)
		}
		h.sessionMu.RLock()
		_, exists := h.sessionStore["expired-session"]
		h.sessionMu.RUnlock()
		if exists {
			t.Error("expired session should have been removed from store")
		}
	})

	t.Run("session owned by different user returns 403", func(t *testing.T) {
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		otherUserSess := makeTestSession("other-user-id", []string{"w1"})
		seedSession(h, "their-session", otherUserSess, time.Now().Add(sessionTTL))

		req := authenticatedRequest(http.MethodGet, "/api/reviews/session/current?session_id=their-session", nil)
		w := httptest.NewRecorder()
		h.GetCurrentItem(w, req)

		if w.Code != http.StatusForbidden {
			t.Errorf("status = %d, want 403", w.Code)
		}
	})

	t.Run("session at end returns done=true", func(t *testing.T) {
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		sess := makeTestSession(testUserID, []string{"w1"})
		sess.Index = 1 // past the end
		seedSession(h, "done-session", sess, time.Now().Add(sessionTTL))

		req := authenticatedRequest(http.MethodGet, "/api/reviews/session/current?session_id=done-session", nil)
		w := httptest.NewRecorder()
		h.GetCurrentItem(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", w.Code)
		}
		var resp map[string]interface{}
		if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
			t.Fatalf("decode failed: %v", err)
		}
		if done, ok := resp["done"].(bool); !ok || !done {
			t.Errorf("expected {done: true}, got %v", resp)
		}
	})

	t.Run("session mid-progress returns current item", func(t *testing.T) {
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		sess := makeTestSession(testUserID, []string{"word-a", "word-b"})
		seedSession(h, "active-session", sess, time.Now().Add(sessionTTL))

		req := authenticatedRequest(http.MethodGet, "/api/reviews/session/current?session_id=active-session", nil)
		w := httptest.NewRecorder()
		h.GetCurrentItem(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200 (body: %s)", w.Code, w.Body.String())
		}
		var item SessionItem
		if err := json.NewDecoder(w.Body).Decode(&item); err != nil {
			t.Fatalf("decode failed: %v", err)
		}
		if item.WordID != "word-a" {
			t.Errorf("WordID = %q, want %q", item.WordID, "word-a")
		}
	})
}

// TestHandler_AdvanceSession tests the AdvanceSession HTTP handler.
func TestHandler_AdvanceSession(t *testing.T) {
	t.Run("invalid JSON body returns 400", func(t *testing.T) {
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		r := httptest.NewRequest(http.MethodPost, "/api/reviews/session/advance", strings.NewReader(`{bad`))
		ctx := context.WithValue(r.Context(), userIDKey, testUserID)
		req := r.WithContext(ctx)
		w := httptest.NewRecorder()
		h.AdvanceSession(w, req)
		if w.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", w.Code)
		}
	})

	t.Run("missing session_id returns 400", func(t *testing.T) {
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		req := authenticatedRequest(http.MethodPost, "/api/reviews/session/advance", map[string]string{})
		w := httptest.NewRecorder()
		h.AdvanceSession(w, req)
		if w.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", w.Code)
		}
	})

	t.Run("non-existent session returns 404", func(t *testing.T) {
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		req := authenticatedRequest(http.MethodPost, "/api/reviews/session/advance", map[string]string{"session_id": "no-such"})
		w := httptest.NewRecorder()
		h.AdvanceSession(w, req)
		if w.Code != http.StatusNotFound {
			t.Errorf("status = %d, want 404", w.Code)
		}
	})

	t.Run("expired session returns 404", func(t *testing.T) {
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		sess := makeTestSession(testUserID, []string{"w1"})
		seedSession(h, "old-sess", sess, time.Now().Add(-time.Minute))
		req := authenticatedRequest(http.MethodPost, "/api/reviews/session/advance", map[string]string{"session_id": "old-sess"})
		w := httptest.NewRecorder()
		h.AdvanceSession(w, req)
		if w.Code != http.StatusNotFound {
			t.Errorf("status = %d, want 404", w.Code)
		}
	})

	t.Run("session owned by other user returns 403", func(t *testing.T) {
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		sess := makeTestSession("other-user", []string{"w1"})
		seedSession(h, "other-sess", sess, time.Now().Add(sessionTTL))
		req := authenticatedRequest(http.MethodPost, "/api/reviews/session/advance", map[string]string{"session_id": "other-sess"})
		w := httptest.NewRecorder()
		h.AdvanceSession(w, req)
		if w.Code != http.StatusForbidden {
			t.Errorf("status = %d, want 403", w.Code)
		}
	})

	t.Run("advance on non-last item returns done=false", func(t *testing.T) {
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		sess := makeTestSession(testUserID, []string{"w1", "w2"})
		seedSession(h, "two-item-sess", sess, time.Now().Add(sessionTTL))

		req := authenticatedRequest(http.MethodPost, "/api/reviews/session/advance", map[string]string{"session_id": "two-item-sess"})
		w := httptest.NewRecorder()
		h.AdvanceSession(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200 (body: %s)", w.Code, w.Body.String())
		}
		var resp AdvanceSessionResponse
		if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
			t.Fatalf("decode failed: %v", err)
		}
		if !resp.Success {
			t.Error("expected Success=true")
		}
		if resp.Done {
			t.Error("expected Done=false after first advance of two-item session")
		}
	})

	t.Run("advance on last item returns done=true", func(t *testing.T) {
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		sess := makeTestSession(testUserID, []string{"w1"})
		seedSession(h, "one-item-sess", sess, time.Now().Add(sessionTTL))

		req := authenticatedRequest(http.MethodPost, "/api/reviews/session/advance", map[string]string{"session_id": "one-item-sess"})
		w := httptest.NewRecorder()
		h.AdvanceSession(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200 (body: %s)", w.Code, w.Body.String())
		}
		var resp AdvanceSessionResponse
		if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
			t.Fatalf("decode failed: %v", err)
		}
		if !resp.Success {
			t.Error("expected Success=true")
		}
		if !resp.Done {
			t.Error("expected Done=true after advancing past last item")
		}
	})

	t.Run("advance mutates the session index in the store", func(t *testing.T) {
		h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
		sess := makeTestSession(testUserID, []string{"w1", "w2", "w3"})
		seedSession(h, "multi-sess", sess, time.Now().Add(sessionTTL))

		for i := 1; i <= 3; i++ {
			req := authenticatedRequest(http.MethodPost, "/api/reviews/session/advance", map[string]string{"session_id": "multi-sess"})
			w := httptest.NewRecorder()
			h.AdvanceSession(w, req)
			if w.Code != http.StatusOK {
				t.Fatalf("advance %d: status = %d, want 200", i, w.Code)
			}
		}

		h.sessionMu.RLock()
		entry := h.sessionStore["multi-sess"]
		h.sessionMu.RUnlock()

		if entry.session.Index != 3 {
			t.Errorf("session.Index = %d, want 3 after 3 advances", entry.session.Index)
		}
	})
}

func TestHandler_SessionStoreConcurrentAccess(t *testing.T) {
	h := NewHandler(&mockWordUseCase{}, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{})
	seedSession(h, "concurrent-session", makeTestSession(testUserID, []string{"w1", "w2", "w3"}), time.Now().Add(sessionTTL))

	var wg sync.WaitGroup
	for i := 0; i < 25; i++ {
		wg.Add(2)

		go func() {
			defer wg.Done()
			req := authenticatedRequest(http.MethodGet, "/api/reviews/session/current?session_id=concurrent-session", nil)
			w := httptest.NewRecorder()
			h.GetCurrentItem(w, req)
			if w.Code != http.StatusOK {
				t.Errorf("GetCurrentItem status = %d, want 200", w.Code)
			}
		}()

		go func() {
			defer wg.Done()
			req := authenticatedRequest(http.MethodPost, "/api/reviews/session/advance", map[string]string{"session_id": "concurrent-session"})
			w := httptest.NewRecorder()
			h.AdvanceSession(w, req)
			if w.Code != http.StatusOK {
				t.Errorf("AdvanceSession status = %d, want 200", w.Code)
			}
		}()
	}
	wg.Wait()

	h.sessionMu.RLock()
	index := h.sessionStore["concurrent-session"].session.Index
	h.sessionMu.RUnlock()

	if index != 3 {
		t.Errorf("session.Index = %d, want capped index 3", index)
	}
}
