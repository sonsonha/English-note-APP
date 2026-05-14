package usecase

import (
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/sonsonha/eng-noting/internal/domain"
)

// ReviewUseCase handles review-related business logic
type ReviewUseCase struct {
	reviewRepo domain.ReviewRepository
	wordRepo   domain.WordRepository
	statsRepo  domain.VocabDailyStatsRepository
}

// NewReviewUseCase creates a new ReviewUseCase
func NewReviewUseCase(
	reviewRepo domain.ReviewRepository,
	wordRepo domain.WordRepository,
	statsRepo domain.VocabDailyStatsRepository,
) *ReviewUseCase {
	return &ReviewUseCase{
		reviewRepo: reviewRepo,
		wordRepo:   wordRepo,
		statsRepo:  statsRepo,
	}
}

// SubmitReviewInput represents input for submitting a review
type SubmitReviewInput struct {
	UserID     string
	WordID     string
	Result     bool
	ReviewType string
}

// SubmitReviewOutput represents output from submitting a review
type SubmitReviewOutput struct {
	Success bool
}

// SubmitReview submits a review for a word
func (uc *ReviewUseCase) SubmitReview(ctx context.Context, input SubmitReviewInput) (*SubmitReviewOutput, error) {
	word, err := uc.wordRepo.GetByID(ctx, input.WordID, input.UserID)
	if err != nil {
		return nil, err
	}

	review := &domain.Review{
		ID:         uuid.NewString(),
		WordID:     input.WordID,
		UserID:     input.UserID,
		Result:     input.Result,
		ReviewType: input.ReviewType,
	}

	if err := uc.reviewRepo.Create(ctx, review); err != nil {
		return nil, err
	}

	// Stats belong to the day the word was added, not today.
	wordDate := word.CreatedAt.UTC().Truncate(24 * time.Hour)
	if err := uc.statsRepo.IncrementReviewedWordsCount(ctx, input.UserID, wordDate); err != nil {
		log.Printf("[WARN] SubmitReview: failed to increment reviewed words count: %v", err)
	}
	if err := uc.statsRepo.RecalculateDailyAccuracyRate(ctx, input.UserID, wordDate); err != nil {
		log.Printf("[WARN] SubmitReview: failed to recalculate daily accuracy rate: %v", err)
	}
	if err := uc.statsRepo.RecalculateDailyStatus(ctx, input.UserID, wordDate); err != nil {
		log.Printf("[WARN] SubmitReview: failed to recalculate daily status: %v", err)
	}

	return &SubmitReviewOutput{Success: true}, nil
}
