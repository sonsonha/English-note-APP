package repository

import (
	"context"
	"database/sql"

	"errors"

	"github.com/sonsonha/eng-noting/internal/domain"
)

// UserRepository implements domain.UserRepository using PostgreSQL
type UserRepository struct {
	db *sql.DB
}

// NewUserRepository creates a new UserRepository
func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Register creates a new user
func (r *UserRepository) Create(ctx context.Context, user *domain.User) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO users (id, email, password_hash, created_at)
		VALUES ($1, $2, $3, $4)
	`, user.ID, user.Email, user.PasswordHash, user.CreatedAt)
	if err != nil {
		if isPgUniqueViolation(err) {
			return domain.ErrEmailAlreadyExists
		}
		return err
	}
	return nil
}

// Map sql.ErNoRows to domain.ErUserNotFound
func mapNoRowsToUserNotFound(err error) bool {
	if errors.Is(err, sql.ErrNoRows) {
		return true
	}
	return false
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	var user domain.User
	err := r.db.QueryRowContext(ctx, `
		SELECT id, email, password_hash, created_at FROM users WHERE id = $1
	`, id).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		if mapNoRowsToUserNotFound(err) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

// Map sql.ErNoRows to domain.ErInvalidCredentials
func mapNoRowsToInvalidCredentials(err error) bool {
	if errors.Is(err, sql.ErrNoRows) {
		return true
	}
	return false
}

// GetByEmail retrieves a user by email
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	var user domain.User
	err := r.db.QueryRowContext(ctx, `
		SELECT id, email, password_hash, created_at FROM users WHERE email = $1
	`, email).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		if mapNoRowsToInvalidCredentials(err) {
			return nil, domain.ErrInvalidCredentials
		}
		return nil, err
	}
	return &user, nil
}
