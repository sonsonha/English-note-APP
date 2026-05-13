package usecase

import (
	"context"
	"time"

	"errors"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/sonsonha/eng-noting/internal/domain"
	"github.com/sonsonha/eng-noting/internal/infrastructure/auth"
	"golang.org/x/crypto/bcrypt"
)

// RegisterInput represents input for registering a user
type RegisterInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RegisterOutput represents output from registering a user
type RegisterOutput struct {
	UserID string `json:"user_id"`
}

// LoginInput represents input for logging in a user
type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginOutput represents output from logging in a user
type LoginOutput struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// AuthUseCase handles authentication-related business logic
type AuthUseCase struct {
	userRepo           domain.UserRepository
	jwtService         *auth.JwtService
	refreshSessionRepo domain.RefreshSessionRepository
}

// NewAuthUseCase creates a new AuthUseCase
func NewAuthUseCase(userRepo domain.UserRepository, jwtService *auth.JwtService, refreshSessionRepo domain.RefreshSessionRepository) *AuthUseCase {
	return &AuthUseCase{userRepo: userRepo, jwtService: jwtService, refreshSessionRepo: refreshSessionRepo}
}

// hashPassword hashes a password using bcrypt
func hashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// Register creates a new user
func (uc *AuthUseCase) Register(ctx context.Context, input RegisterInput) (*RegisterOutput, error) {
	passwordHash, err := hashPassword(input.Password)
	if err != nil {
		return nil, err
	}
	userID := uuid.NewString()
	user := &domain.User{
		ID:           userID,
		Email:        input.Email,
		PasswordHash: passwordHash,
		CreatedAt:    time.Now(),
	}
	if err := uc.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}
	return &RegisterOutput{UserID: userID}, nil
}

type VerifyRefreshTokenInput struct {
	RefreshToken string `json:"refresh_token"`
}

type VerifyRefreshTokenOutput struct {
	RefreshSession *domain.RefreshSession `json:"refresh_session"`
}

func (uc *AuthUseCase) VerifyRefreshToken(ctx context.Context, input VerifyRefreshTokenInput) (*VerifyRefreshTokenOutput, error) {
	refreshHash, err := uc.jwtService.HashRefreshPlain(input.RefreshToken)
	if err != nil {
		return nil, err
	}
	refreshSession, err := uc.refreshSessionRepo.GetByTokenHash(ctx, refreshHash)
	if err != nil {
		return nil, err
	}
	return &VerifyRefreshTokenOutput{RefreshSession: refreshSession}, nil
}

// // Login authenticates a user
// func (uc *AuthUseCase) Login(ctx context.Context, input LoginInput) (*LoginOutput, error) {
// 	user, err := uc.userRepo.GetByEmail(ctx, input.Email)
// 	if err != nil {
// 		return nil, err
// 	}
// 	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
// 		return nil, domain.ErrInvalidCredentials
// 	}
// 	familyID := uuid.NewString()
// 	// Create initial refresh session
// 	// Generate access token
// 	token, err := uc.jwtService.GenerateAccessToken(user.ID, familyID)
// 	if err != nil {
// 		return nil, domain.ErrInternalServerError
// 	}
// 	return &LoginOutput{Token: token}, nil
// }

// Login authenticates a user
func (uc *AuthUseCase) Login(ctx context.Context, input LoginInput) (*LoginOutput, error) {
	user, err := uc.userRepo.GetByEmail(ctx, input.Email)
	if err != nil {
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, domain.ErrInvalidCredentials
	}
	familyID := uuid.NewString()
	// Create initial refresh session
	refreshSession, newRefreshPlain, err := uc.CreateInitialRefreshSession(ctx, user.ID, familyID)
	if err != nil {
		return nil, err
		// return nil, domain.DebugError
	}
	// Generate access token
	token, err := uc.jwtService.GenerateAccessToken(refreshSession.UserID, refreshSession.FamilyID)
	if err != nil {
		return nil, err
		// return nil, domain.DebugError
	}
	return &LoginOutput{AccessToken: token, RefreshToken: newRefreshPlain}, nil
}

func (uc *AuthUseCase) CreateInitialRefreshSession(ctx context.Context, userID string, familyID string) (*domain.RefreshSession, string, error) {
	const maxAttempts = 3

	for i := 0; i < maxAttempts; i++ {
		newRefreshPlain, err := uc.jwtService.GenerateRefreshPlain()
		if err != nil {
			return nil, "", err
		}
		newRefreshHash, err := uc.jwtService.HashRefreshPlain(newRefreshPlain)
		if err != nil {
			return nil, "", err
		}

		refreshSession := &domain.RefreshSession{
			ID:           uuid.NewString(),
			UserID:       userID,
			FamilyID:     familyID,
			TokenHash:    newRefreshHash,
			ExpiresAt:    time.Now().Add(time.Duration(uc.jwtService.RefreshExpireMinutes()) * time.Minute),
			RevokedAt:    nil,
			ReplacedByID: nil,
			CreatedAt:    time.Now(),
		}

		if err := uc.refreshSessionRepo.Create(ctx, refreshSession); err != nil {
			// thử lại nếu collision hiếm gặp
			if isPgUniqueViolation(err) && i < maxAttempts-1 {
				continue
			}
			return nil, "", err
		}

		return refreshSession, newRefreshPlain, nil
	}

	return nil, "", domain.ErrInternalServerError
}

func isPgUniqueViolation(err error) bool {
	var pgErr *pq.Error
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

// func (uc *AuthUseCase) CreateInitialRefreshSession(ctx context.Context, userID string, familyID string) (*domain.RefreshSession, string, error) {
// 	newRefreshPlain, err := uc.jwtService.GenerateRefreshPlain()
// 	if err != nil {
// 		return nil, "", err
// 	}
// 	newRefreshHash, err := uc.jwtService.HashRefreshPlain(newRefreshPlain)
// 	if err != nil {
// 		return nil, "", err
// 	}

// 	refreshSession := &domain.RefreshSession{
// 		ID:           uuid.NewString(),
// 		UserID:       userID,
// 		FamilyID:     familyID,
// 		TokenHash:    newRefreshHash,
// 		ExpiresAt:    time.Now().Add(time.Duration(uc.jwtService.RefreshExpireMinutes()) * time.Minute),
// 		RevokedAt:    nil,
// 		ReplacedByID: nil,
// 		CreatedAt:    time.Now(),
// 	}
// 	err = uc.refreshSessionRepo.Create(ctx, refreshSession)
// 	if err != nil {
// 		return nil, "", err
// 	}
// 	return refreshSession, newRefreshPlain, nil
// }

// RefreshTokenInput represents input for refreshing a token
type RefreshTokenInput struct {
	RefreshToken string `json:"refresh_token"`
}

// RefreshTokenOutput represents output from refreshing a token
type RefreshTokenOutput struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// RefreshToken refreshes a token
func (uc *AuthUseCase) RefreshToken(ctx context.Context, input RefreshTokenInput) (*RefreshTokenOutput, error) {
	refreshHash, err := uc.jwtService.HashRefreshPlain(input.RefreshToken)
	if err != nil {
		return nil, err
	}
	refreshSession, err := uc.refreshSessionRepo.GetByTokenHash(ctx, refreshHash)
	if err != nil {
		return nil, err
	}

	newRefreshPlain, err := uc.jwtService.GenerateRefreshPlain()
	if err != nil {
		return nil, err
	}
	newRefreshHash, err := uc.jwtService.HashRefreshPlain(newRefreshPlain)
	if err != nil {
		return nil, err
	}

	newRefreshSessionID := uuid.NewString()
	newRefreshSession := &domain.RefreshSession{
		ID:           newRefreshSessionID,
		UserID:       refreshSession.UserID,
		FamilyID:     refreshSession.FamilyID,
		TokenHash:    newRefreshHash,
		ExpiresAt:    time.Now().Add(time.Duration(uc.jwtService.RefreshExpireMinutes()) * time.Minute),
		RevokedAt:    nil,
		ReplacedByID: nil,
		CreatedAt:    time.Now(),
	}

	// Check if the refresh session is revoked
	if refreshSession.RevokedAt != nil {
		return nil, domain.ErrRevokedRefreshToken
	}

	// Check if the refresh session is expired
	if refreshSession.ExpiresAt.Before(time.Now()) {
		return nil, domain.ErrExpiredRefreshToken
	}

	// Check if the refresh session is replaced by another session
	if refreshSession.ReplacedByID != nil {
		return nil, domain.ErrRevokedRefreshToken
	}

	err = uc.refreshSessionRepo.Rotate(ctx, refreshSession.ID, newRefreshSession)
	if err != nil {
		return nil, err
	}
	accessToken, err := uc.jwtService.GenerateAccessToken(refreshSession.UserID, refreshSession.FamilyID)
	if err != nil {
		return nil, err
	}
	return &RefreshTokenOutput{AccessToken: accessToken, RefreshToken: newRefreshPlain}, nil
}

func (uc *AuthUseCase) Logout(ctx context.Context, input RefreshTokenInput) error {
	verifyRefreshTokenOutput, err := uc.VerifyRefreshToken(ctx, VerifyRefreshTokenInput{RefreshToken: input.RefreshToken})
	if err != nil {
		return err
	}
	refreshHash, err := uc.jwtService.HashRefreshPlain(input.RefreshToken)
	if err != nil {
		return err
	}
	refreshSession, err := uc.refreshSessionRepo.GetByTokenHash(ctx, refreshHash)
	if err != nil {
		return err
	}
	if verifyRefreshTokenOutput.RefreshSession.UserID != refreshSession.UserID {
		return domain.ErrUnauthorized
	}

	// Check if the refresh session is revoked
	if refreshSession.RevokedAt != nil {
		return domain.ErrUnauthorized
	}

	// Check if the refresh session is expired
	if refreshSession.ExpiresAt.Before(time.Now()) {
		return domain.ErrUnauthorized
	}

	// Check if the refresh session is replaced by another session
	if refreshSession.ReplacedByID != nil {
		return domain.ErrUnauthorized
	}

	// Revoke the refresh session
	err = uc.refreshSessionRepo.RevokeByID(ctx, refreshSession.ID)
	if err != nil {
		return err
	}
	return nil
}
