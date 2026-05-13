package usecase

import (
	"context"
	"time"

	"github.com/sonsonha/eng-noting/internal/domain"
)

type CalendarStatsUseCase struct {
	vocabDailyStatsRepo domain.VocabDailyStatsRepository
}

func NewCalendarStatsUseCase(vocabDailyStatsRepo domain.VocabDailyStatsRepository) *CalendarStatsUseCase {
	return &CalendarStatsUseCase{
		vocabDailyStatsRepo: vocabDailyStatsRepo,
	}
}

type GetCalendarStatsInput struct {
	UserID string
	From   time.Time
	To     time.Time
}

type CalendarStatsOutput struct {
	Stats []domain.VocabDailyStats
}

type CalendarSummaryStatsInput struct {
	UserID string
	From   time.Time
	To     time.Time
}

type CalendarSummaryStatsOutput struct {
	TotalWordsAdded           int
	PercentageOfWordsReviewed int
	AccuracyRate              float64
	Status                    domain.CalendarStatus
}

func (uc *CalendarStatsUseCase) GetCalendarStats(ctx context.Context, input GetCalendarStatsInput) (*CalendarStatsOutput, error) {
	stats, err := uc.vocabDailyStatsRepo.GetStats(ctx, input.UserID, input.From, input.To)
	if err != nil {
		return nil, err
	}
	return &CalendarStatsOutput{Stats: stats}, nil
}

type BackfillDailyStatsInput struct {
	UserID string
}

func (uc *CalendarStatsUseCase) BackfillDailyStats(ctx context.Context, input BackfillDailyStatsInput) error {
	return uc.vocabDailyStatsRepo.BackfillDailyStats(ctx, input.UserID)
}

func (uc *CalendarStatsUseCase) GetCalendarSummaryStats(ctx context.Context, input CalendarSummaryStatsInput) (*CalendarSummaryStatsOutput, error) {
	stats, err := uc.vocabDailyStatsRepo.GetStats(ctx, input.UserID, input.From, input.To)
	if err != nil {
		return nil, err
	}
	totalWordsAdded := 0
	for _, stat := range stats {
		totalWordsAdded += stat.AddedWordsCount
	}
	totalWordsReviewed := 0
	for _, stat := range stats {
		totalWordsReviewed += stat.ReviewedWordsCount
	}
	percentageOfWordsReviewed := int((float64(totalWordsReviewed) / float64(totalWordsAdded)) * 100)
	accuracyRate := 0.0
	for _, stat := range stats {
		accuracyRate += stat.AccuracyRate
	}
	accuracyRate /= float64(len(stats))
	return &CalendarSummaryStatsOutput{
		TotalWordsAdded:           totalWordsAdded,
		PercentageOfWordsReviewed: percentageOfWordsReviewed,
		AccuracyRate:              accuracyRate,
		Status:                    domain.CalculateCalendarStatus(len(stats), totalWordsReviewed, int(accuracyRate)),
	}, nil
}
