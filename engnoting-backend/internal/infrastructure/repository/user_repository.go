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

// Create creates a new user. PasswordHash may be empty for OAuth-only users (stored as NULL).
func (r *UserRepository) Create(ctx context.Context, user *domain.User) error {
	var ph interface{}
	if user.PasswordHash != "" {
		ph = user.PasswordHash
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO users (id, email, password_hash, google_id, is_admin, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, user.ID, user.Email, ph, user.GoogleID, user.IsAdmin, user.CreatedAt)
	if err != nil {
		if isPgUniqueViolation(err) {
			return domain.ErrEmailAlreadyExists
		}
		return err
	}
	return nil
}

func scanUser(row interface {
	Scan(dest ...any) error
}) (*domain.User, error) {
	var user domain.User
	var passwordHash sql.NullString
	var googleID sql.NullString
	err := row.Scan(&user.ID, &user.Email, &passwordHash, &googleID, &user.IsAdmin, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	user.PasswordHash = passwordHash.String
	if googleID.Valid {
		s := googleID.String
		user.GoogleID = &s
	}
	return &user, nil
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, email, password_hash, google_id, is_admin, created_at FROM users WHERE id = $1
	`, id)
	user, err := scanUser(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

// GetByEmail retrieves a user by email
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, email, password_hash, google_id, is_admin, created_at FROM users WHERE email = $1
	`, email)
	user, err := scanUser(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrInvalidCredentials
		}
		return nil, err
	}
	return user, nil
}

// GetByGoogleID retrieves a user by Google OAuth subject ID
func (r *UserRepository) GetByGoogleID(ctx context.Context, googleID string) (*domain.User, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, email, password_hash, google_id, is_admin, created_at FROM users WHERE google_id = $1
	`, googleID)
	user, err := scanUser(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

// ListAll returns all users with word and review counts.
func (r *UserRepository) ListAll(ctx context.Context) ([]domain.UserSummary, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT
			u.id, u.email, u.is_admin, u.created_at,
			COALESCE((SELECT COUNT(*) FROM words   WHERE user_id = u.id), 0) AS word_count,
			COALESCE((SELECT COUNT(*) FROM reviews WHERE user_id = u.id), 0) AS review_count
		FROM users u
		ORDER BY u.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []domain.UserSummary
	for rows.Next() {
		var u domain.UserSummary
		if err := rows.Scan(&u.ID, &u.Email, &u.IsAdmin, &u.CreatedAt, &u.WordCount, &u.ReviewCount); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// UpdateAdminStatus sets or removes admin privileges for a user.
func (r *UserRepository) UpdateAdminStatus(ctx context.Context, userID string, isAdmin bool) error {
	_, err := r.db.ExecContext(ctx, `UPDATE users SET is_admin = $1 WHERE id = $2`, isAdmin, userID)
	return err
}
