package domain

import (
	"math"
	"time"
)

// CalculateMPS computes a deterministic memory priority score (0-100) and
// returns the dominant reason driving the score.
func CalculateMPS(stat WordStats) (float64, string) {
	days := daysSinceLastReview(stat.LastReviewedAt)
	timeFactor := clamp(days/30.0, 0, 1)

	accuracy := clamp(stat.AccuracyRate, 0, 1)
	accuracyFactor := clamp(1-accuracy, 0, 1)

	confidenceFactor := 0.5
	if stat.Confidence != nil {
		confidenceFactor = clamp(1-(float64(*stat.Confidence)/5.0), 0, 1)
	}

	failureFactor := 0.0
	if stat.RecentReviews > 0 {
		failureFactor = clamp(float64(stat.RecentFailures)/float64(stat.RecentReviews), 0, 1)
	}

	frequencyFactor := clamp(stat.FrequencyScore, 0, 1)

	score := (timeFactor * 30) + //5 points for time factor
		(accuracyFactor * 30) + // 30 points for accuracy factor
		(confidenceFactor * 15) +
		(failureFactor * 15) +
		(frequencyFactor * 10)

	reason := generateReason(timeFactor, accuracyFactor, confidenceFactor, failureFactor, frequencyFactor)

	return clamp(score, 0, 100), reason
}

func daysSinceLastReview(lastReviewedAt *time.Time) float64 {
	if lastReviewedAt == nil {
		return 30
	}

	days := time.Since(*lastReviewedAt).Hours() / 24
	if days < 0 {
		return 0
	}
	return days
}

func generateReason(timeFactor, accuracyFactor, confidenceFactor, failureFactor, frequencyFactor float64) string {
	max := timeFactor
	reason := "Long time since last review"

	if accuracyFactor > max {
		max = accuracyFactor
		reason = "Low accuracy rate"
	}
	if confidenceFactor > max {
		max = confidenceFactor
		reason = "Low confidence"
	}
	if failureFactor > max {
		max = failureFactor
		reason = "Recent failures"
	}
	if frequencyFactor > max {
		reason = "High frequency word"
	}

	return reason
}

func clamp(value, minValue, maxValue float64) float64 {
	return math.Max(minValue, math.Min(maxValue, value))
}
