package usecase

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/sonsonha/eng-noting/internal/domain"
)

// mockReviewRepo implements domain.ReviewRepository.
type mockReviewRepo struct {
	createFn           func(ctx context.Context, review *domain.Review) error
	getStatsFn         func(ctx context.Context, wordID string) (*domain.ReviewStats, error)
	updateStatsFn      func(ctx context.Context, wordID string, result bool) error
	getLastReviewTypeFn func(ctx context.Context, wordID string) (string, error)
	rebuildStatsFn     func(ctx context.Context) error
}

func (m *mockReviewRepo) Create(ctx context.Context, review *domain.Review) error {
	if m.createFn != nil {
		return m.createFn(ctx, review)
	}
	return nil
}

func (m *mockReviewRepo) GetStats(ctx context.Context, wordID string) (*domain.ReviewStats, error) {
	if m.getStatsFn != nil {
		return m.getStatsFn(ctx, wordID)
	}
	return &domain.ReviewStats{}, nil
}

func (m *mockReviewRepo) UpdateStats(ctx context.Context, wordID string, result bool) error {
	if m.updateStatsFn != nil {
		return m.updateStatsFn(ctx, wordID, result)
	}
	return nil
}

func (m *mockReviewRepo) GetLastReviewType(ctx context.Context, wordID string) (string, error) {
	if m.getLastReviewTypeFn != nil {
		return m.getLastReviewTypeFn(ctx, wordID)
	}
	return "", nil
}

func (m *mockReviewRepo) RebuildStats(ctx context.Context) error {
	if m.rebuildStatsFn != nil {
		return m.rebuildStatsFn(ctx)
	}
	return nil
}

func TestReviewUseCase_SubmitReview(t *testing.T) {
	ctx := context.Background()

	validWord := &domain.Word{
		ID:        "word-id",
		UserID:    "user-id",
		Text:      "hello",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	t.Run("happy path returns success true", func(t *testing.T) {
		wordRepo := &mockWordRepo{
			getByIDFn: func(_ context.Context, _, _ string) (*domain.Word, error) {
				return validWord, nil
			},
		}
		reviewRepo := &mockReviewRepo{
			createFn: func(_ context.Context, r *domain.Review) error {
				return nil
			},
		}
		uc := NewReviewUseCase(reviewRepo, wordRepo, &mockStatsRepo{})

		out, err := uc.SubmitReview(ctx, SubmitReviewInput{
			UserID:     "user-id",
			WordID:     "word-id",
			Result:     true,
			ReviewType: "mcq",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if out == nil || !out.Success {
			t.Errorf("expected Success=true, got %v", out)
		}
	})

	t.Run("word not found propagates domain.ErrWordNotFound (not usecase.ErrNotFound)", func(t *testing.T) {
		// NOTE: ReviewUseCase.SubmitReview does NOT translate domain.ErrWordNotFound
		// to usecase.ErrNotFound (unlike WordUseCase.GetWord). This documents the actual behavior.
		wordRepo := &mockWordRepo{
			getByIDFn: func(_ context.Context, _, _ string) (*domain.Word, error) {
				return nil, domain.ErrWordNotFound
			},
		}
		uc := NewReviewUseCase(&mockReviewRepo{}, wordRepo, &mockStatsRepo{})

		_, err := uc.SubmitReview(ctx, SubmitReviewInput{
			UserID: "user-id", WordID: "missing", Result: true, ReviewType: "mcq",
		})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		// The error IS domain.ErrWordNotFound, NOT usecase.ErrNotFound
		if !errors.Is(err, domain.ErrWordNotFound) {
			t.Errorf("error = %v, want domain.ErrWordNotFound", err)
		}
		if errors.Is(err, ErrNotFound) {
			t.Errorf("error should NOT be usecase.ErrNotFound (SubmitReview does not translate errors)")
		}
	})

	t.Run("review repo Create error is propagated", func(t *testing.T) {
		createErr := errors.New("insert failed")
		wordRepo := &mockWordRepo{
			getByIDFn: func(_ context.Context, _, _ string) (*domain.Word, error) {
				return validWord, nil
			},
		}
		reviewRepo := &mockReviewRepo{
			createFn: func(_ context.Context, _ *domain.Review) error {
				return createErr
			},
		}
		uc := NewReviewUseCase(reviewRepo, wordRepo, &mockStatsRepo{})

		_, err := uc.SubmitReview(ctx, SubmitReviewInput{
			UserID: "user-id", WordID: "word-id", Result: false, ReviewType: "typing",
		})
		if !errors.Is(err, createErr) {
			t.Errorf("error = %v, want %v", err, createErr)
		}
	})

	t.Run("creates review with correct fields", func(t *testing.T) {
		var createdReview *domain.Review
		wordRepo := &mockWordRepo{
			getByIDFn: func(_ context.Context, _, _ string) (*domain.Word, error) {
				return validWord, nil
			},
		}
		reviewRepo := &mockReviewRepo{
			createFn: func(_ context.Context, r *domain.Review) error {
				createdReview = r
				return nil
			},
		}
		uc := NewReviewUseCase(reviewRepo, wordRepo, &mockStatsRepo{})

		_, err := uc.SubmitReview(ctx, SubmitReviewInput{
			UserID:     "user-id",
			WordID:     "word-id",
			Result:     false,
			ReviewType: "fill_blank",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if createdReview == nil {
			t.Fatal("createFn was not called")
		}
		if createdReview.WordID != "word-id" {
			t.Errorf("WordID = %q, want %q", createdReview.WordID, "word-id")
		}
		if createdReview.UserID != "user-id" {
			t.Errorf("UserID = %q, want %q", createdReview.UserID, "user-id")
		}
		if createdReview.Result != false {
			t.Errorf("Result = %v, want false", createdReview.Result)
		}
		if createdReview.ReviewType != "fill_blank" {
			t.Errorf("ReviewType = %q, want %q", createdReview.ReviewType, "fill_blank")
		}
		if createdReview.ID == "" {
			t.Error("Review ID should not be empty (UUID generated)")
		}
	})

	t.Run("word repo GetByID error (non-not-found) is propagated", func(t *testing.T) {
		repoErr := errors.New("db connection failed")
		wordRepo := &mockWordRepo{
			getByIDFn: func(_ context.Context, _, _ string) (*domain.Word, error) {
				return nil, repoErr
			},
		}
		uc := NewReviewUseCase(&mockReviewRepo{}, wordRepo, &mockStatsRepo{})

		_, err := uc.SubmitReview(ctx, SubmitReviewInput{
			UserID: "user-id", WordID: "word-id", Result: true, ReviewType: "mcq",
		})
		if !errors.Is(err, repoErr) {
			t.Errorf("error = %v, want %v", err, repoErr)
		}
	})
}
