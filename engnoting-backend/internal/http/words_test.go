package http

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/sonsonha/eng-noting/internal/domain"
	"github.com/sonsonha/eng-noting/internal/usecase"
)

// mockWordUseCase implements WordUseCaser for testing.
type mockWordUseCase struct {
	createWordFn     func(ctx context.Context, input usecase.CreateWordInput) (*usecase.CreateWordOutput, error)
	updateWordFn     func(ctx context.Context, input usecase.UpdateWordInput) (*usecase.UpdateWordOutput, error)
	getWordFn        func(ctx context.Context, input usecase.GetWordInput) (*usecase.GetWordOutput, error)
	listWordsFn      func(ctx context.Context, input usecase.ListWordsInput) (*usecase.ListWordsOutput, error)
	regenerateWordFn func(ctx context.Context, input usecase.RegenerateWordInput) (*usecase.RegenerateWordOutput, error)
}

func (m *mockWordUseCase) CreateWord(ctx context.Context, input usecase.CreateWordInput) (*usecase.CreateWordOutput, error) {
	if m.createWordFn != nil {
		return m.createWordFn(ctx, input)
	}
	return &usecase.CreateWordOutput{WordID: "new-word-id"}, nil
}

func (m *mockWordUseCase) UpdateWord(ctx context.Context, input usecase.UpdateWordInput) (*usecase.UpdateWordOutput, error) {
	if m.updateWordFn != nil {
		return m.updateWordFn(ctx, input)
	}
	return &usecase.UpdateWordOutput{WordID: input.WordID}, nil
}

func (m *mockWordUseCase) GetWord(ctx context.Context, input usecase.GetWordInput) (*usecase.GetWordOutput, error) {
	if m.getWordFn != nil {
		return m.getWordFn(ctx, input)
	}
	return nil, nil
}

func (m *mockWordUseCase) ListWords(ctx context.Context, input usecase.ListWordsInput) (*usecase.ListWordsOutput, error) {
	if m.listWordsFn != nil {
		return m.listWordsFn(ctx, input)
	}
	return &usecase.ListWordsOutput{Words: nil, Total: 0}, nil
}
func (m *mockWordUseCase) RegenerateWord(ctx context.Context, input usecase.RegenerateWordInput) (*usecase.RegenerateWordOutput, error) {
	if m.regenerateWordFn != nil {
		return m.regenerateWordFn(ctx, input)
	}
	return &usecase.RegenerateWordOutput{WordID: "new-word-id"}, nil
}

func (m *mockWordUseCase) BackfillAIData(_ context.Context) (*usecase.BackfillAIDataOutput, error) {
	return &usecase.BackfillAIDataOutput{}, nil
}

func (m *mockWordUseCase) GetWordsBySource(_ context.Context, _ usecase.GetWordsBySourceInput) (*usecase.GetWordsBySourceOutput, error) {
	return &usecase.GetWordsBySourceOutput{Words: nil}, nil
}

// authenticatedRequest creates a request with a valid Bearer UUID in the Authorization header.
func authenticatedRequest(method, target string, body interface{}) *http.Request {
	var bodyReader *bytes.Reader
	if body != nil {
		data, _ := json.Marshal(body)
		bodyReader = bytes.NewReader(data)
	} else {
		bodyReader = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, target, bodyReader)
	req.Header.Set("Authorization", "Bearer "+testUserID)
	req.Header.Set("Content-Type", "application/json")

	// Inject user ID into context directly (bypassing AuthMiddleware for handler unit tests).
	ctx := context.WithValue(req.Context(), userIDKey, testUserID)
	return req.WithContext(ctx)
}

func strPtr(s string) *string { return &s }
func iPtr(i int) *int         { return &i }

func sampleWordWithAI() *domain.Word {
	pos := "noun"
	cefr := "B2"
	return &domain.Word{
		ID:         "word-uuid",
		UserID:     testUserID,
		Text:       "serendipity",
		Context:    strPtr("a fortunate discovery"),
		Confidence: iPtr(4),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
		AIData: &domain.WordAIData{
			WordID:       "word-uuid",
			Definition:   "Finding something good unexpectedly",
			ExampleGood:  "It was serendipity that they met.",
			PartOfSpeech: &pos,
			CEFRLevel:    &cefr,
		},
	}
}

func sampleWordWithoutAI() *domain.Word {
	return &domain.Word{
		ID:         "word-uuid",
		UserID:     testUserID,
		Text:       "hello",
		Confidence: iPtr(3),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
		AIData:     nil,
	}
}

// TestHandler_CreateWord tests the CreateWord HTTP handler.
func TestHandler_CreateWord(t *testing.T) {
	tests := []struct {
		name       string
		body       interface{}
		rawBody    string
		useFn      func(ctx context.Context, input usecase.CreateWordInput) (*usecase.CreateWordOutput, error)
		wantStatus int
		wantWordID string
	}{
		{
			name:       "invalid JSON body returns 400",
			rawBody:    `not json`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty text field returns 400",
			body:       map[string]string{"text": "", "context": ""},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing text key returns 400",
			body:       map[string]string{"context": "some context"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "use case error returns 500",
			body: map[string]string{"text": "hello"},
			useFn: func(_ context.Context, _ usecase.CreateWordInput) (*usecase.CreateWordOutput, error) {
				return nil, errors.New("db error")
			},
			wantStatus: http.StatusInternalServerError,
		},
		{
			name: "happy path returns 201 with word_id",
			body: map[string]string{"text": "hello", "context": "greeting"},
			useFn: func(_ context.Context, _ usecase.CreateWordInput) (*usecase.CreateWordOutput, error) {
				return &usecase.CreateWordOutput{WordID: "abc-123"}, nil
			},
			wantStatus: http.StatusCreated,
			wantWordID: "abc-123",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			uc := &mockWordUseCase{createWordFn: tt.useFn}
			h := NewHandler(uc, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{}, &mockTopicUseCase{}, &mockAdminUseCase{})

			var req *http.Request
			if tt.rawBody != "" {
				r := httptest.NewRequest(http.MethodPost, "/api/words", strings.NewReader(tt.rawBody))
				ctx := context.WithValue(r.Context(), userIDKey, testUserID)
				req = r.WithContext(ctx)
			} else {
				req = authenticatedRequest(http.MethodPost, "/api/words", tt.body)
			}

			w := httptest.NewRecorder()
			h.CreateWord(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d (body: %s)", w.Code, tt.wantStatus, w.Body.String())
			}

			if tt.wantWordID != "" {
				var resp CreateWordResponse
				if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}
				if resp.WordID != tt.wantWordID {
					t.Errorf("word_id = %q, want %q", resp.WordID, tt.wantWordID)
				}
			}
		})
	}
}

// TestHandler_GetWord tests the GetWord HTTP handler.
func TestHandler_GetWord(t *testing.T) {
	tests := []struct {
		name         string
		wordID       string
		useFn        func(ctx context.Context, input usecase.GetWordInput) (*usecase.GetWordOutput, error)
		wantStatus   int
		wantAIFields bool
	}{
		{
			name:   "domain.ErrWordNotFound returns 404",
			wordID: "missing",
			useFn: func(_ context.Context, _ usecase.GetWordInput) (*usecase.GetWordOutput, error) {
				return nil, domain.ErrWordNotFound
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:   "other use case error returns 500",
			wordID: "w1",
			useFn: func(_ context.Context, _ usecase.GetWordInput) (*usecase.GetWordOutput, error) {
				return nil, errors.New("db crash")
			},
			wantStatus: http.StatusInternalServerError,
		},
		{
			name:   "word without AI data returns response without AI fields",
			wordID: "w1",
			useFn: func(_ context.Context, _ usecase.GetWordInput) (*usecase.GetWordOutput, error) {
				return &usecase.GetWordOutput{Word: sampleWordWithoutAI()}, nil
			},
			wantStatus:   http.StatusOK,
			wantAIFields: false,
		},
		{
			name:   "word with AI data returns response with all AI fields",
			wordID: "w1",
			useFn: func(_ context.Context, _ usecase.GetWordInput) (*usecase.GetWordOutput, error) {
				return &usecase.GetWordOutput{Word: sampleWordWithAI()}, nil
			},
			wantStatus:   http.StatusOK,
			wantAIFields: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			uc := &mockWordUseCase{getWordFn: tt.useFn}
			h := NewHandler(uc, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{}, &mockTopicUseCase{}, &mockAdminUseCase{})

			req := authenticatedRequest(http.MethodGet, "/api/words/"+tt.wordID, nil)
			req.SetPathValue("id", tt.wordID)
			w := httptest.NewRecorder()

			h.GetWord(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d (body: %s)", w.Code, tt.wantStatus, w.Body.String())
			}

			if tt.wantStatus == http.StatusOK {
				var resp WordResponse
				if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}
				if tt.wantAIFields {
					if resp.Definition == nil || *resp.Definition == "" {
						t.Error("expected Definition to be present")
					}
					if resp.ExampleGood == nil || *resp.ExampleGood == "" {
						t.Error("expected ExampleGood to be present")
					}
				} else {
					if resp.Definition != nil {
						t.Errorf("expected Definition to be nil, got %q", *resp.Definition)
					}
				}
			}
		})
	}
}

// TestHandler_ListWords tests the ListWords HTTP handler.
func TestHandler_ListWords(t *testing.T) {
	type capturedInput struct {
		limit  int
		offset int
	}

	tests := []struct {
		name        string
		queryParams string
		useFn       func(ctx context.Context, input usecase.ListWordsInput) (*usecase.ListWordsOutput, error)
		wantStatus  int
		wantCapture *capturedInput
		wantTotal   int
	}{
		{
			name:        "default limit=50 and offset=0 when not specified",
			queryParams: "",
			wantStatus:  http.StatusOK,
			wantCapture: &capturedInput{limit: 50, offset: 0},
		},
		{
			name:        "custom limit and offset are passed through",
			queryParams: "?limit=10&offset=20",
			wantStatus:  http.StatusOK,
			wantCapture: &capturedInput{limit: 10, offset: 20},
		},
		{
			name:        "limit above 200 is capped to 200",
			queryParams: "?limit=999",
			wantStatus:  http.StatusOK,
			wantCapture: &capturedInput{limit: 200, offset: 0},
		},
		{
			name:        "invalid limit string falls back to default 50",
			queryParams: "?limit=abc",
			wantStatus:  http.StatusOK,
			wantCapture: &capturedInput{limit: 50, offset: 0},
		},
		{
			name:        "negative limit is not accepted, keeps default 50",
			queryParams: "?limit=-5",
			wantStatus:  http.StatusOK,
			wantCapture: &capturedInput{limit: 50, offset: 0},
		},
		{
			name:        "negative offset is not accepted, keeps default 0",
			queryParams: "?offset=-10",
			wantStatus:  http.StatusOK,
			wantCapture: &capturedInput{limit: 50, offset: 0},
		},
		{
			name:        "invalid offset string falls back to default 0",
			queryParams: "?offset=xyz",
			wantStatus:  http.StatusOK,
			wantCapture: &capturedInput{limit: 50, offset: 0},
		},
		{
			name:        "use case error returns 500",
			queryParams: "",
			useFn: func(_ context.Context, _ usecase.ListWordsInput) (*usecase.ListWordsOutput, error) {
				return nil, errors.New("db error")
			},
			wantStatus: http.StatusInternalServerError,
		},
		{
			name:        "happy path returns 200 with words and total",
			queryParams: "?limit=2&offset=0",
			useFn: func(_ context.Context, _ usecase.ListWordsInput) (*usecase.ListWordsOutput, error) {
				return &usecase.ListWordsOutput{
					Words: []*domain.Word{sampleWordWithoutAI(), sampleWordWithoutAI()},
					Total: 10,
				}, nil
			},
			wantStatus: http.StatusOK,
			wantTotal:  10,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var gotInput usecase.ListWordsInput
			defaultFn := func(_ context.Context, input usecase.ListWordsInput) (*usecase.ListWordsOutput, error) {
				gotInput = input
				return &usecase.ListWordsOutput{Words: nil, Total: 0}, nil
			}
			useFn := tt.useFn
			if useFn == nil {
				useFn = defaultFn
			} else {
				// Wrap to also capture input
				origFn := useFn
				useFn = func(ctx context.Context, input usecase.ListWordsInput) (*usecase.ListWordsOutput, error) {
					gotInput = input
					return origFn(ctx, input)
				}
			}

			uc := &mockWordUseCase{listWordsFn: useFn}
			h := NewHandler(uc, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{}, &mockTopicUseCase{}, &mockAdminUseCase{})

			target := fmt.Sprintf("/api/words%s", tt.queryParams)
			req := authenticatedRequest(http.MethodGet, target, nil)
			w := httptest.NewRecorder()

			h.ListWords(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d (body: %s)", w.Code, tt.wantStatus, w.Body.String())
			}

			if tt.wantCapture != nil {
				if gotInput.Limit != tt.wantCapture.limit {
					t.Errorf("limit = %d, want %d", gotInput.Limit, tt.wantCapture.limit)
				}
				if gotInput.Offset != tt.wantCapture.offset {
					t.Errorf("offset = %d, want %d", gotInput.Offset, tt.wantCapture.offset)
				}
			}

			if tt.wantStatus == http.StatusOK && tt.wantTotal > 0 {
				var resp ListWordsResponse
				if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}
				if resp.Total != tt.wantTotal {
					t.Errorf("total = %d, want %d", resp.Total, tt.wantTotal)
				}
			}
		})
	}
}

func TestHandler_ListWords_AIDataMapped(t *testing.T) {
	wordWithAI := sampleWordWithAI()
	uc := &mockWordUseCase{
		listWordsFn: func(_ context.Context, _ usecase.ListWordsInput) (*usecase.ListWordsOutput, error) {
			return &usecase.ListWordsOutput{
				Words: []*domain.Word{wordWithAI},
				Total: 1,
			}, nil
		},
	}
	h := NewHandler(uc, &mockReviewUseCase{}, &mockSessionUseCase{}, &mockAuthUseCase{}, &mockCalendarStatsUseCase{}, &mockWordQuizUseCase{}, &mockTopicUseCase{}, &mockAdminUseCase{})

	req := authenticatedRequest(http.MethodGet, "/api/words", nil)
	w := httptest.NewRecorder()
	h.ListWords(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}

	var resp ListWordsResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}
	if len(resp.Words) != 1 {
		t.Fatalf("expected 1 word, got %d", len(resp.Words))
	}
	if resp.Words[0].Definition == nil || *resp.Words[0].Definition == "" {
		t.Error("AI definition should be present in list response")
	}
}
