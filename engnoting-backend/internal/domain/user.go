package domain

import (
	"context"
	"time"
)

// User represents a user of the application.
type User struct {
	ID           string
	Email        string
	PasswordHash string
	GoogleID     *string
	IsAdmin      bool
	CreatedAt    time.Time
}

// UserSummary is a user with aggregate stats, used for admin listing.
type UserSummary struct {
	ID          string
	Email       string
	IsAdmin     bool
	CreatedAt   time.Time
	WordCount   int
	ReviewCount int
}

// UserRepository defines the interface for user operations.
type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByID(ctx context.Context, id string) (*User, error)
	GetByGoogleID(ctx context.Context, googleID string) (*User, error)
	ListAll(ctx context.Context) ([]UserSummary, error)
	UpdateAdminStatus(ctx context.Context, userID string, isAdmin bool) error
}
