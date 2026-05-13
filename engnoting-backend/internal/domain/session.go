package domain

import "context"

// SessionItem represents a word scheduled for review.
type SessionItem struct {
	WordID        string
	WordText      string
	ReviewType    string
	PriorityScore float64
	Reason        string
	Quiz          *WordQuiz // nil if not yet generated
}

// Session represents a review session for a user.
type Session struct {
	UserID string
	Items  []SessionItem
	Index  int
}

// Current returns the current item or nil if done.
func (s *Session) Current() *SessionItem {
	if s == nil || s.Index >= len(s.Items) {
		return nil
	}
	return &s.Items[s.Index]
}

// Advance moves to the next item in the session.
func (s *Session) Advance() {
	if s == nil {
		return
	}
	if s.Index < len(s.Items) {
		s.Index++
	}
}

// Done reports whether the session is finished.
func (s *Session) Done() bool {
	return s == nil || s.Index >= len(s.Items)
}

// ReviewQueueItem represents a queue entry for session building.
type ReviewQueueItem struct {
	UserID        string
	WordID        string
	PriorityScore float64
	Reason        string
}

// ReviewQueueRepository defines persistence operations for the review queue.
type ReviewQueueRepository interface {
	Rebuild(ctx context.Context, userID string, items []ReviewQueueItem) error
	GetQueueItems(ctx context.Context, userID string) ([]ReviewQueueItem, error)
}
