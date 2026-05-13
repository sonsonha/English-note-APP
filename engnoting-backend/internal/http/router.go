package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/sonsonha/eng-noting/internal/infrastructure/auth"
)

// NewRouter wires all routes and middlewares and returns the root http.Handler.
func NewRouter(handler *Handler, jwtService *auth.JwtService) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)

	// Public endpoints
	r.Route("/api/v1/auth", func(r chi.Router) {
		r.Post("/register", handler.Register)
		r.Post("/login", handler.Login)
		r.Post("/refresh", handler.RefreshToken)
		r.Post("/logout", handler.Logout)
	})

	// Protected endpoints
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(func(next http.Handler) http.Handler {
			return AuthMiddleware(next, jwtService)
		})

		// Word endpoints
		r.Post("/words", handler.CreateWord)
		r.Put("/words/{id}", handler.UpdateWord)
		r.Put("/ai-words/{id}", handler.RegenerateWord)
		r.Get("/words", handler.ListWords)
		r.Get("/words/{id}", handler.GetWord)
		r.Get("/words/{id}/quizzes", handler.GetQuizzesByWordID)

		r.Get("/words/calendar-stats", handler.GetDailyStats)
		r.Get("/words/calendar-summary", handler.GetCalendarSummaryStats)

		// Review endpoints
		r.Post("/reviews/session", handler.StartSession)
		r.Get("/reviews/session/current", handler.GetCurrentItem)
		r.Post("/reviews/session/advance", handler.AdvanceSession)
		r.Post("/reviews/submit", handler.SubmitReview)
	})

	// Health check endpoint (no auth)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	return r
}
