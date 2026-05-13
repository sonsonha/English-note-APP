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
	quizRepo   domain.WordQuizRepository
	aiSvc      domain.AIService
	jobRepo    domain.AIPendingJobRepository
}

// NewReviewUseCase creates a new ReviewUseCase
func NewReviewUseCase(
	reviewRepo domain.ReviewRepository,
	wordRepo domain.WordRepository,
	statsRepo domain.VocabDailyStatsRepository,
	quizRepo domain.WordQuizRepository,
	aiSvc domain.AIService,
	jobRepo domain.AIPendingJobRepository,
) *ReviewUseCase {
	return &ReviewUseCase{
		reviewRepo: reviewRepo,
		wordRepo:   wordRepo,
		statsRepo:  statsRepo,
		quizRepo:   quizRepo,
		aiSvc:      aiSvc,
		jobRepo:    jobRepo,
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

	today := time.Now().UTC().Truncate(24 * time.Hour)
	if err := uc.statsRepo.IncrementReviewedWordsCount(ctx, input.UserID, today); err != nil {
		log.Printf("[WARN] SubmitReview: failed to increment reviewed words count: %v", err)
	}
	if err := uc.statsRepo.RecalculateDailyAccuracyRate(ctx, input.UserID, today); err != nil {
		log.Printf("[WARN] SubmitReview: failed to recalculate daily accuracy rate: %v", err)
	}

	stats, err := uc.reviewRepo.GetStats(ctx, input.WordID)
	if err == nil &&
		stats.AccuracyRate >= domain.AdvancedQuizAccuracyThreshold &&
		stats.TotalReviews >= domain.AdvancedQuizMinReviews {
		wordContext := ""
		if word.Context != nil {
			wordContext = *word.Context
		}
		go uc.generateAdvancedQuizzes(input.WordID, word.Text, wordContext)
	}

	return &SubmitReviewOutput{Success: true}, nil
}

func (uc *ReviewUseCase) generateAdvancedQuizzes(wordID, word, wordContext string) {
	ctx := context.Background()

	exists, err := uc.quizRepo.HasAdvancedQuizzes(ctx, wordID)
	if err != nil || exists {
		return
	}

	quizzes, err := uc.aiSvc.GenerateAdvancedQuizzes(word, wordContext)
	if err != nil {
		log.Printf("[WARN] generateAdvancedQuizzes: failed for word %q: %v", word, err)
		if enqErr := uc.jobRepo.Enqueue(context.Background(), wordID, word, wordContext, domain.AIJobTypeAdvancedQuizzes); enqErr != nil {
			log.Printf("[WARN] generateAdvancedQuizzes: failed to enqueue retry: %v", enqErr)
		}
		return
	}

	wq := make([]domain.WordQuiz, len(quizzes))
	for i, q := range quizzes {
		choices := q.Choices
		if choices == nil {
			choices = []string{}
		}
		wq[i] = domain.WordQuiz{
			WordID:   wordID,
			QuizType: q.QuizType,
			Question: q.Question,
			Choices:  choices,
			Answer:   q.Answer,
		}
	}
	if err := uc.quizRepo.StoreQuizzes(ctx, wq); err != nil {
		log.Printf("[WARN] generateAdvancedQuizzes: failed to store quizzes for word %q: %v", word, err)
	}
}
