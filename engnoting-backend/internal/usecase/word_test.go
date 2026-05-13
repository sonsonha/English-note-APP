package usecase

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/sonsonha/eng-noting/internal/domain"
)

// mockWordRepo implements domain.WordRepository.
type mockWordRepo struct {
	createFn      func(ctx context.Context, word *domain.Word) error
	updateFn      func(ctx context.Context, word *domain.Word) error
	getByIDFn     func(ctx context.Context, wordID, userID string) (*domain.Word, error)
	listFn        func(ctx context.Context, userID string, limit, offset int) ([]*domain.Word, error)
	countFn       func(ctx context.Context, userID string) (int, error)
	storeAIDataFn func(ctx context.Context, wordID string, aiData *domain.WordAIData) error
}

func (m *mockWordRepo) Create(ctx context.Context, word *domain.Word) error {
	if m.createFn != nil {
		return m.createFn(ctx, word)
	}
	return nil
}

func (m *mockWordRepo) Update(ctx context.Context, word *domain.Word) error {
	if m.updateFn != nil {
		return m.updateFn(ctx, word)
	}
	return nil
}

func (m *mockWordRepo) GetByID(ctx context.Context, wordID, userID string) (*domain.Word, error) {
	if m.getByIDFn != nil {
		return m.getByIDFn(ctx, wordID, userID)
	}
	return nil, nil
}

func (m *mockWordRepo) List(ctx context.Context, userID string, limit, offset int) ([]*domain.Word, error) {
	if m.listFn != nil {
		return m.listFn(ctx, userID, limit, offset)
	}
	return nil, nil
}

func (m *mockWordRepo) Count(ctx context.Context, userID string) (int, error) {
	if m.countFn != nil {
		return m.countFn(ctx, userID)
	}
	return 0, nil
}

func (m *mockWordRepo) StoreAIData(ctx context.Context, wordID string, aiData *domain.WordAIData) error {
	if m.storeAIDataFn != nil {
		return m.storeAIDataFn(ctx, wordID, aiData)
	}
	return nil
}

func (m *mockWordRepo) UpdateVIMeaning(_ context.Context, _, _ string) error { return nil }

func (m *mockWordRepo) ListMissingVIMeaning(_ context.Context, _ int) ([]*domain.Word, error) {
	return nil, nil
}

func (m *mockWordRepo) ListMissingQuizzes(_ context.Context, _ int) ([]*domain.Word, error) {
	return nil, nil
}

func (m *mockWordRepo) ListByTopic(_ context.Context, _, _ string, _, _ int) ([]*domain.Word, error) {
	return nil, nil
}

func (m *mockWordRepo) GetTopics(_ context.Context, _ string) ([]domain.TopicSummary, error) {
	return nil, nil
}

// mockAIService implements domain.AIService.
type mockAIService struct {
	explainWordFn func(word, ctx string) (*domain.AIExplanation, error)
	called        bool
}

func (m *mockAIService) ExplainWord(word, ctx string) (*domain.AIExplanation, error) {
	m.called = true
	if m.explainWordFn != nil {
		return m.explainWordFn(word, ctx)
	}
	return &domain.AIExplanation{Definition: "def", ExampleGood: "ex"}, nil
}

func (m *mockAIService) GenerateInitialQuizzes(word, ctx string) ([]domain.AIQuiz, error) {
	return nil, nil
}

func (m *mockAIService) GenerateAdvancedQuizzes(word, ctx string) ([]domain.AIQuiz, error) {
	return nil, nil
}

type mockQuizRepo struct{}

func (m *mockQuizRepo) StoreQuizzes(_ context.Context, _ []domain.WordQuiz) error   { return nil }
func (m *mockQuizRepo) GetByWordID(_ context.Context, _ string) ([]domain.WordQuiz, error) {
	return nil, nil
}
func (m *mockQuizRepo) HasAdvancedQuizzes(_ context.Context, _ string) (bool, error) {
	return false, nil
}

type mockJobRepo struct{}

func (m *mockJobRepo) Enqueue(_ context.Context, _, _, _, _ string) error    { return nil }
func (m *mockJobRepo) FetchDue(_ context.Context, _ int) ([]domain.AIPendingJob, error) {
	return nil, nil
}
func (m *mockJobRepo) MarkDone(_ context.Context, _ string) error            { return nil }
func (m *mockJobRepo) RecordAttempt(_ context.Context, _, _ string) error    { return nil }

type mockStatsRepo struct{}

func (m *mockStatsRepo) GetStats(ctx context.Context, userID string, from, to time.Time) ([]domain.VocabDailyStats, error) {
	return nil, nil
}
func (m *mockStatsRepo) IncrementAddedWordsCount(ctx context.Context, userID string, date time.Time) error {
	return nil
}
func (m *mockStatsRepo) IncrementReviewedWordsCount(ctx context.Context, userID string, date time.Time) error {
	return nil
}
func (m *mockStatsRepo) RecalculateDailyAccuracyRate(ctx context.Context, userID string, date time.Time) error {
	return nil
}
func (m *mockStatsRepo) BackfillDailyStats(ctx context.Context, userID string) error { return nil }
func (m *mockStatsRepo) RecalculateDailyStatus(ctx context.Context, userID string, date time.Time) error {
	return nil
}

func TestWordUseCase_CreateWord(t *testing.T) {
	ctx := context.Background()

	t.Run("happy path returns UUID word ID", func(t *testing.T) {
		repo := &mockWordRepo{
			createFn: func(_ context.Context, w *domain.Word) error {
				return nil
			},
		}
		aiSvc := &mockAIService{}
		uc := NewWordUseCase(repo, aiSvc, &mockStatsRepo{}, &mockQuizRepo{}, &mockJobRepo{})

		out, err := uc.CreateWord(ctx, CreateWordInput{
			UserID:  "user-1",
			Text:    "hello",
			Context: "greeting",
		})

		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if out == nil {
			t.Fatal("expected output, got nil")
		}
		if _, parseErr := uuid.Parse(out.WordID); parseErr != nil {
			t.Errorf("WordID %q is not a valid UUID: %v", out.WordID, parseErr)
		}
	})

	t.Run("sets default confidence to 1 and context on created word", func(t *testing.T) {
		var createdWord *domain.Word
		repo := &mockWordRepo{
			createFn: func(_ context.Context, w *domain.Word) error {
				createdWord = w
				return nil
			},
		}
		uc := NewWordUseCase(repo, &mockAIService{}, &mockStatsRepo{}, &mockQuizRepo{}, &mockJobRepo{})

		_, err := uc.CreateWord(ctx, CreateWordInput{UserID: "u1", Text: "test", Context: "my context"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if createdWord == nil {
			t.Fatal("createFn was not called")
		}
		if createdWord.Confidence == nil || *createdWord.Confidence != 1 {
			t.Errorf("Confidence = %v, want 1", createdWord.Confidence)
		}
		if createdWord.Context == nil || *createdWord.Context != "my context" {
			t.Errorf("Context = %v, want %q", createdWord.Context, "my context")
		}
		if createdWord.UserID != "u1" {
			t.Errorf("UserID = %q, want %q", createdWord.UserID, "u1")
		}
	})

	t.Run("repo create error is returned", func(t *testing.T) {
		repoErr := errors.New("db error")
		repo := &mockWordRepo{
			createFn: func(_ context.Context, _ *domain.Word) error {
				return repoErr
			},
		}
		uc := NewWordUseCase(repo, &mockAIService{}, &mockStatsRepo{}, &mockQuizRepo{}, &mockJobRepo{})

		_, err := uc.CreateWord(ctx, CreateWordInput{UserID: "u1", Text: "fail"})
		if !errors.Is(err, repoErr) {
			t.Errorf("error = %v, want %v", err, repoErr)
		}
	})
}

func TestWordUseCase_GetWord(t *testing.T) {
	ctx := context.Background()

	sampleWord := &domain.Word{
		ID:        "word-id",
		UserID:    "user-1",
		Text:      "hello",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tests := []struct {
		name      string
		repoErr   error
		repoWord  *domain.Word
		wantErr   error
		wantNilOK bool
	}{
		{
			name:     "happy path returns word",
			repoWord: sampleWord,
			wantErr:  nil,
		},
		{
			name:    "domain.ErrWordNotFound is returned as-is",
			repoErr: domain.ErrWordNotFound,
			wantErr: domain.ErrWordNotFound,
		},
		{
			name:    "other repo error propagated as-is",
			repoErr: errors.New("connection lost"),
			wantErr: errors.New("connection lost"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &mockWordRepo{
				getByIDFn: func(_ context.Context, _, _ string) (*domain.Word, error) {
					return tt.repoWord, tt.repoErr
				},
			}
			uc := NewWordUseCase(repo, &mockAIService{}, &mockStatsRepo{}, &mockQuizRepo{}, &mockJobRepo{})

			out, err := uc.GetWord(ctx, GetWordInput{WordID: "word-id", UserID: "user-1"})

			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected error %v, got nil", tt.wantErr)
				}
				// For sentinel errors, use errors.Is; for generic errors check message
				if tt.wantErr == domain.ErrWordNotFound {
					if !errors.Is(err, domain.ErrWordNotFound) {
						t.Errorf("error = %v, want %v", err, domain.ErrWordNotFound)
					}
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if out == nil || out.Word == nil {
				t.Fatal("expected word in output, got nil")
			}
			if out.Word.ID != sampleWord.ID {
				t.Errorf("Word.ID = %q, want %q", out.Word.ID, sampleWord.ID)
			}
		})
	}
}

func TestWordUseCase_ListWords(t *testing.T) {
	ctx := context.Background()

	makeWords := func(n int) []*domain.Word {
		words := make([]*domain.Word, n)
		for i := range words {
			words[i] = &domain.Word{ID: uuid.NewString(), Text: "word"}
		}
		return words
	}

	t.Run("happy path returns words and count", func(t *testing.T) {
		words := makeWords(3)
		repo := &mockWordRepo{
			listFn: func(_ context.Context, _ string, _, _ int) ([]*domain.Word, error) {
				return words, nil
			},
			countFn: func(_ context.Context, _ string) (int, error) {
				return 42, nil
			},
		}
		uc := NewWordUseCase(repo, &mockAIService{}, &mockStatsRepo{}, &mockQuizRepo{}, &mockJobRepo{})

		out, err := uc.ListWords(ctx, ListWordsInput{UserID: "u1", Limit: 10, Offset: 0})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(out.Words) != 3 {
			t.Errorf("Words count = %d, want 3", len(out.Words))
		}
		if out.Total != 42 {
			t.Errorf("Total = %d, want 42", out.Total)
		}
	})

	t.Run("Count error falls back to len(words) with no error returned", func(t *testing.T) {
		words := makeWords(5)
		repo := &mockWordRepo{
			listFn: func(_ context.Context, _ string, _, _ int) ([]*domain.Word, error) {
				return words, nil
			},
			countFn: func(_ context.Context, _ string) (int, error) {
				return 0, errors.New("count failed")
			},
		}
		uc := NewWordUseCase(repo, &mockAIService{}, &mockStatsRepo{}, &mockQuizRepo{}, &mockJobRepo{})

		out, err := uc.ListWords(ctx, ListWordsInput{UserID: "u1", Limit: 10, Offset: 0})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if out.Total != 5 {
			t.Errorf("Total = %d, want 5 (fallback to len)", out.Total)
		}
	})

	t.Run("List error is propagated", func(t *testing.T) {
		listErr := errors.New("list failed")
		repo := &mockWordRepo{
			listFn: func(_ context.Context, _ string, _, _ int) ([]*domain.Word, error) {
				return nil, listErr
			},
		}
		uc := NewWordUseCase(repo, &mockAIService{}, &mockStatsRepo{}, &mockQuizRepo{}, &mockJobRepo{})

		_, err := uc.ListWords(ctx, ListWordsInput{UserID: "u1", Limit: 10})
		if !errors.Is(err, listErr) {
			t.Errorf("error = %v, want %v", err, listErr)
		}
	})

	t.Run("passes limit and offset to repo", func(t *testing.T) {
		var gotLimit, gotOffset int
		repo := &mockWordRepo{
			listFn: func(_ context.Context, _ string, limit, offset int) ([]*domain.Word, error) {
				gotLimit = limit
				gotOffset = offset
				return nil, nil
			},
			countFn: func(_ context.Context, _ string) (int, error) {
				return 0, nil
			},
		}
		uc := NewWordUseCase(repo, &mockAIService{}, &mockStatsRepo{}, &mockQuizRepo{}, &mockJobRepo{})
		_, _ = uc.ListWords(ctx, ListWordsInput{UserID: "u1", Limit: 25, Offset: 50})

		if gotLimit != 25 {
			t.Errorf("limit = %d, want 25", gotLimit)
		}
		if gotOffset != 50 {
			t.Errorf("offset = %d, want 50", gotOffset)
		}
	})
}
