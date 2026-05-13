package domain

import (
	"context"
	"time"
)

type RefreshSession struct {
	ID           string    `db:"id"`
	UserID       string    `db:"user_id"`
	FamilyID     string    `db:"family_id"`
	TokenHash    string    `db:"token_hash"`
	ExpiresAt    time.Time `db:"expires_at"`
	// RevokeAt and ReplacedByID are optional because they are not always set
	RevokedAt    *time.Time `db:"revoked_at"`
	ReplacedByID *string    `db:"replaced_by_id"`
	CreatedAt    time.Time `db:"created_at"`
}

type RefreshSessionRepository interface {
	Create(ctx context.Context, session *RefreshSession) error
	GetByTokenHash(ctx context.Context, tokenHash string) (*RefreshSession, error)
	Rotate(ctx context.Context, oldID string, newSession *RefreshSession) error // Transaction: revoke old + create new + set replaced_by
	RevokeByID(ctx context.Context, id string) error
	RevokeByFamilyID(ctx context.Context, familyID string) error
	RevokeAllByUserID(ctx context.Context, userID string) error
}
