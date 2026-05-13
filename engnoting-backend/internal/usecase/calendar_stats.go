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
	totalWordsReviewed := 0
	for _, stat := range stats {
		totalWordsAdded += stat.AddedWordsCount
		totalWordsReviewed += stat.ReviewedWordsCount
	}

	// Average accuracy only over days where words were added
	activeDays := 0
	totalAccuracy := 0.0
	for _, stat := range stats {
		if stat.AddedWordsCount > 0 {
			totalAccuracy += stat.AccuracyRate
			activeDays++
		}
	}
	avgAccuracy := 0.0
	if activeDays > 0 {
		avgAccuracy = totalAccuracy / float64(activeDays)
	}

	reviewRate := 0
	if totalWordsAdded > 0 {
		reviewRate = int(float64(totalWordsReviewed) / float64(totalWordsAdded) * 100)
	}

	var status domain.CalendarStatus
	switch {
	case totalWordsAdded == 0:
		status = domain.CalendarStatusFallow
	case totalWordsReviewed == 0:
		status = domain.CalendarStatusTending
	case avgAccuracy >= 0.8:
		status = domain.CalendarStatusMastered
	case avgAccuracy >= 0.6:
		status = domain.CalendarStatusSteady
	default:
		status = domain.CalendarStatusTending
	}

	return &CalendarSummaryStatsOutput{
		TotalWordsAdded:           totalWordsAdded,
		PercentageOfWordsReviewed: reviewRate,
		AccuracyRate:              avgAccuracy,
		Status:                    status,
	}, nil
}
