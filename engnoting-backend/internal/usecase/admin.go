package usecase

import (
	"context"
	"time"

	"github.com/sonsonha/eng-noting/internal/domain"
)

// AdminUseCase handles admin management logic.
type AdminUseCase struct {
	userRepo       domain.UserRepository
	adminStatsRepo domain.AdminStatsRepository
}

// NewAdminUseCase creates a new AdminUseCase.
func NewAdminUseCase(userRepo domain.UserRepository, adminStatsRepo domain.AdminStatsRepository) *AdminUseCase {
	return &AdminUseCase{userRepo: userRepo, adminStatsRepo: adminStatsRepo}
}

// CheckIsAdmin returns true if the given user is an admin.
func (uc *AdminUseCase) CheckIsAdmin(ctx context.Context, userID string) (bool, error) {
	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return false, err
	}
	return user.IsAdmin, nil
}

// AdminUserItem is a single user row returned to the admin UI.
type AdminUserItem struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	IsAdmin     bool      `json:"is_admin"`
	CreatedAt   time.Time `json:"created_at"`
	WordCount   int       `json:"word_count"`
	ReviewCount int       `json:"review_count"`
}

// ListUsersOutput is returned by ListUsers.
type ListUsersOutput struct {
	Users []AdminUserItem `json:"users"`
	Total int             `json:"total"`
}

// ListUsers returns all users with stats.
func (uc *AdminUseCase) ListUsers(ctx context.Context) (*ListUsersOutput, error) {
	summaries, err := uc.userRepo.ListAll(ctx)
	if err != nil {
		return nil, err
	}
	items := make([]AdminUserItem, len(summaries))
	for i, s := range summaries {
		items[i] = AdminUserItem{
			ID:          s.ID,
			Email:       s.Email,
			IsAdmin:     s.IsAdmin,
			CreatedAt:   s.CreatedAt,
			WordCount:   s.WordCount,
			ReviewCount: s.ReviewCount,
		}
	}
	return &ListUsersOutput{Users: items, Total: len(items)}, nil
}

// ToggleAdminInput is the input for ToggleAdmin.
type ToggleAdminInput struct {
	RequesterID string
	TargetID    string
	IsAdmin     bool
}

// ToggleAdmin sets or removes admin status for a target user.
// A user cannot remove their own admin status to prevent lockout.
func (uc *AdminUseCase) ToggleAdmin(ctx context.Context, input ToggleAdminInput) error {
	if input.RequesterID == input.TargetID && !input.IsAdmin {
		return domain.ErrForbidden
	}
	return uc.userRepo.UpdateAdminStatus(ctx, input.TargetID, input.IsAdmin)
}

// AdminStatsOutput is the full stats response for the admin dashboard.
type AdminStatsOutput struct {
	Dashboard *domain.AdminDashboardStats  `json:"dashboard"`
	Vocab     *domain.AdminVocabAnalytics  `json:"vocab"`
	AI        *domain.AdminAIStats         `json:"ai"`
	Reviews   *domain.AdminReviewAnalytics `json:"reviews"`
}

// GetStats returns aggregated admin dashboard stats.
func (uc *AdminUseCase) GetStats(ctx context.Context) (*AdminStatsOutput, error) {
	dashboard, err := uc.adminStatsRepo.GetDashboardStats(ctx)
	if err != nil {
		return nil, err
	}
	vocab, err := uc.adminStatsRepo.GetVocabAnalytics(ctx)
	if err != nil {
		return nil, err
	}
	ai, err := uc.adminStatsRepo.GetAIStats(ctx)
	if err != nil {
		return nil, err
	}
	reviews, err := uc.adminStatsRepo.GetReviewAnalytics(ctx)
	if err != nil {
		return nil, err
	}
	return &AdminStatsOutput{
		Dashboard: dashboard,
		Vocab:     vocab,
		AI:        ai,
		Reviews:   reviews,
	}, nil
}
