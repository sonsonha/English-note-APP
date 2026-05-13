package domain

import (
	"context"
	"time"
)

type CalendarStatus string

const (
	CalendarStatusFallow   CalendarStatus = "fallow"
	CalendarStatusTending  CalendarStatus = "tending"
	CalendarStatusSteady   CalendarStatus = "steady"
	CalendarStatusMastered CalendarStatus = "mastered"
)

type VocabDailyStats struct {
	UserID             string
	StatDate           time.Time
	AddedWordsCount    int
	ReviewedWordsCount int
	AccuracyRate       float64
	Status             CalendarStatus
	UpdatedAt          time.Time
}

type VocabDailyStatsRepository interface {
	GetStats(ctx context.Context, userID string, from, to time.Time) ([]VocabDailyStats, error)
	IncrementAddedWordsCount(ctx context.Context, userID string, date time.Time) error
	IncrementReviewedWordsCount(ctx context.Context, userID string, date time.Time) error
	RecalculateDailyAccuracyRate(ctx context.Context, userID string, date time.Time) error
	BackfillDailyStats(ctx context.Context, userID string) error
	RecalculateDailyStatus(ctx context.Context, userID string, date time.Time) error
}

// func CalculateCalendarStatus(added, reviewed, correct int) CalendarStatus {
// 	if added == 0 {
// 		return CalendarStatusFallow
// 	}
// 	if reviewed == 0 {
// 		return CalendarStatusTending
// 	}

// 	accuracy := float64(correct) / float64(reviewed)

// 	switch {
// 	case accuracy >= 0.8:
// 		return CalendarStatusMastered
// 	case accuracy >= 0.6:
// 		return CalendarStatusSteady
// 	default:
// 		return CalendarStatusTending
// 	}
// }
