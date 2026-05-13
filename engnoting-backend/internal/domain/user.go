package domain

import (
	"context"
	"time"
)

// User represents a user of the application.
type User struct {
	ID        string
	Email     string
	PasswordHash  string
	CreatedAt time.Time
}

// UserRepository defines the interface for user operations.
type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByID(ctx context.Context, id string) (*User, error)
}