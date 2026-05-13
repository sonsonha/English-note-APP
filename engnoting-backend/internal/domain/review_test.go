package domain

import "testing"

func TestSelectType(t *testing.T) {
	tests := []struct {
		name     string
		ctx      ReviewContext
		wantType string
	}{
		{
			name:     "zero TotalReviews returns mcq",
			ctx:      ReviewContext{TotalReviews: 0, AccuracyRate: 0.9},
			wantType: "mcq",
		},
		{
			name:     "AccuracyRate below 0.4 returns mcq",
			ctx:      ReviewContext{TotalReviews: 10, AccuracyRate: 0.39},
			wantType: "mcq",
		},
		{
			name:     "AccuracyRate exactly 0.0 returns mcq",
			ctx:      ReviewContext{TotalReviews: 5, AccuracyRate: 0.0},
			wantType: "mcq",
		},
		{
			name:     "AccuracyRate exactly 0.4 returns match",
			ctx:      ReviewContext{TotalReviews: 5, AccuracyRate: 0.4},
			wantType: "match",
		},
		{
			name:     "AccuracyRate 0.6 returns match",
			ctx:      ReviewContext{TotalReviews: 5, AccuracyRate: 0.6},
			wantType: "match",
		},
		{
			name:     "AccuracyRate just below 0.7 returns match",
			ctx:      ReviewContext{TotalReviews: 5, AccuracyRate: 0.699},
			wantType: "match",
		},
		{
			name:     "AccuracyRate 0.7 TotalReviews 3 returns typing (default)",
			ctx:      ReviewContext{TotalReviews: 3, AccuracyRate: 0.7},
			wantType: "typing",
		},
		{
			name:     "AccuracyRate 0.75 TotalReviews 10 returns typing (default)",
			ctx:      ReviewContext{TotalReviews: 10, AccuracyRate: 0.75},
			wantType: "typing",
		},
		{
			name:     "AccuracyRate 0.8 TotalReviews 4 returns typing (reviews < 5)",
			ctx:      ReviewContext{TotalReviews: 4, AccuracyRate: 0.8},
			wantType: "typing",
		},
		{
			name:     "AccuracyRate 0.8 TotalReviews 5 returns fill_blank",
			ctx:      ReviewContext{TotalReviews: 5, AccuracyRate: 0.8},
			wantType: "fill_blank",
		},
		{
			name:     "AccuracyRate 1.0 TotalReviews 100 returns fill_blank",
			ctx:      ReviewContext{TotalReviews: 100, AccuracyRate: 1.0},
			wantType: "fill_blank",
		},
		{
			name:     "AccuracyRate exactly 0.8 TotalReviews exactly 5 returns fill_blank",
			ctx:      ReviewContext{TotalReviews: 5, AccuracyRate: 0.8},
			wantType: "fill_blank",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SelectType(tt.ctx)
			if got != tt.wantType {
				t.Errorf("SelectType() = %q, want %q", got, tt.wantType)
			}
		})
	}
}

func TestReason(t *testing.T) {
	ctx := ReviewContext{}

	tests := []struct {
		name       string
		reviewType string
		wantReason string
	}{
		{
			name:       "mcq reason",
			reviewType: "mcq",
			wantReason: "Low accuracy; use multiple choice to reinforce basics",
		},
		{
			name:       "match reason",
			reviewType: "match",
			wantReason: "Medium accuracy; matching helps recall and associations",
		},
		{
			name:       "fill_blank reason",
			reviewType: "fill_blank",
			wantReason: "High mastery; fill-in-blank tests precise recall",
		},
		{
			name:       "typing reason",
			reviewType: "typing",
			wantReason: "High accuracy; typing strengthens long-term retention",
		},
		{
			name:       "unknown type returns default reason",
			reviewType: "unknown",
			wantReason: "Default review format",
		},
		{
			name:       "empty type returns default reason",
			reviewType: "",
			wantReason: "Default review format",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Reason(ctx, tt.reviewType)
			if got != tt.wantReason {
				t.Errorf("Reason() = %q, want %q", got, tt.wantReason)
			}
		})
	}
}
