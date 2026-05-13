package repository

import (
	"context"
	"database/sql"

	"github.com/sonsonha/eng-noting/internal/domain"
)

// RefreshSessionsRepository implements domain.RefreshSessionsRepository using PostgreSQL
type RefreshSessionsRepository struct {
	db *sql.DB
}

// NewRefreshSessionsRepository creates a new RefreshSessionsRepository
func NewRefreshSessionsRepository(db *sql.DB) *RefreshSessionsRepository {
	return &RefreshSessionsRepository{db: db}
}

// Create creates a new refresh session
func (r *RefreshSessionsRepository) Create(ctx context.Context, session *domain.RefreshSession) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO refresh_sessions (id, user_id, family_id, token_hash, expires_at, revoked_at, replaced_by_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, session.ID, session.UserID, session.FamilyID, session.TokenHash, session.ExpiresAt, session.RevokedAt, session.ReplacedByID)
	if err != nil {
		return err
	}
	return nil
}

// GetByTokenHash retrieves a refresh session by token hash
func (r *RefreshSessionsRepository) GetByTokenHash(ctx context.Context, tokenHash string) (*domain.RefreshSession, error) {
	var session domain.RefreshSession
	err := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, family_id, token_hash, expires_at, revoked_at, replaced_by_id FROM refresh_sessions WHERE token_hash = $1
	`, tokenHash).Scan(&session.ID, &session.UserID, &session.FamilyID, &session.TokenHash, &session.ExpiresAt, &session.RevokedAt, &session.ReplacedByID)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

// Rotate rotates a refresh session (transaction: revoke old + insert new + set replaced_by)
func (r *RefreshSessionsRepository) Rotate(ctx context.Context, oldID string, newSession *domain.RefreshSession) error {
	// Revoke old session
	// Wrap in a transaction
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	ctxWithTx := context.WithValue(ctx, txKey, tx)

	_, err = tx.ExecContext(ctxWithTx, `
		UPDATE refresh_sessions SET revoked_at = now() WHERE id = $1
	`, oldID)
	if err != nil {
		return err
	}

	// Insert new session
	_, err = tx.ExecContext(ctxWithTx, `
		INSERT INTO refresh_sessions (id, user_id, family_id, token_hash, expires_at, revoked_at, replaced_by_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, newSession.ID, newSession.UserID, newSession.FamilyID, newSession.TokenHash, newSession.ExpiresAt, newSession.RevokedAt, newSession.ReplacedByID)
	if err != nil {
		return err
	}

	// Set replaced_by_id
	_, err = tx.ExecContext(ctxWithTx, `
		UPDATE refresh_sessions SET replaced_by_id = $1 WHERE id = $2
	`, newSession.ID, oldID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// RevokeByID revokes a refresh session by ID
func (r *RefreshSessionsRepository) RevokeByID(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE refresh_sessions SET revoked_at = now() WHERE id = $1
	`, id)
	if err != nil {
		return err
	}
	return nil
}

// RevokeByFamilyID revokes all refresh sessions by family ID
func (r *RefreshSessionsRepository) RevokeByFamilyID(ctx context.Context, familyID string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE refresh_sessions SET revoked_at = now() WHERE family_id = $1
	`, familyID)
	if err != nil {
		return err
	}
	return nil
}

// RevokeAllByUserID revokes all refresh sessions by user ID
func (r *RefreshSessionsRepository) RevokeAllByUserID(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE refresh_sessions SET revoked_at = now() WHERE user_id = $1
	`, userID)
	if err != nil {
		return err
	}
	return nil
}
