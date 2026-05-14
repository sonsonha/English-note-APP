package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	stdhttp "net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/lib/pq"

	"github.com/sonsonha/eng-noting/internal/config"
	httphandler "github.com/sonsonha/eng-noting/internal/http"
	infraai "github.com/sonsonha/eng-noting/internal/infrastructure/ai"
	"github.com/sonsonha/eng-noting/internal/infrastructure/ai/deepseek"
	"github.com/sonsonha/eng-noting/internal/infrastructure/ai/gemini"
	"github.com/sonsonha/eng-noting/internal/infrastructure/ai/openai"
	"github.com/sonsonha/eng-noting/internal/infrastructure/auth"
	infrarepo "github.com/sonsonha/eng-noting/internal/infrastructure/repository"
	"github.com/sonsonha/eng-noting/internal/usecase"
	"github.com/sonsonha/eng-noting/internal/worker"
)

func main() {
	// cfg := config.LoadConfig()
	cfg := config.LoadConfigDev()

	appCtx, appCancel := context.WithCancel(context.Background())
	defer appCancel()

	// Database setup
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("Database connection established successfully.")

	// Infrastructure layer: Repositories
	wordRepo := infrarepo.NewWordRepository(db)
	reviewRepo := infrarepo.NewReviewRepository(db)
	reviewQueueRepo := infrarepo.NewReviewQueueRepository(db)
	wordStatsRepo := infrarepo.NewWordStatsRepository(db)
	userRepo := infrarepo.NewUserRepository(db)
	refreshSessionRepo := infrarepo.NewRefreshSessionsRepository(db)
	vocabDailyStatsRepo := infrarepo.NewVocabDailyStatsRepository(db)
	wordQuizRepo := infrarepo.NewWordQuizRepository(db)
	aiPendingJobRepo := infrarepo.NewAIPendingJobRepository(db)
	adminStatsRepo := infrarepo.NewAdminStatsRepository(db)

	// Infrastructure layer: AI Service
	var aiClient infraai.Client
	switch cfg.AIProvider {
	case "gemini":
		aiClient = gemini.NewClient(cfg.AIAPIKey)
	case "deepseek":
		aiClient = deepseek.NewClient(cfg.AIAPIKey)
	default:
		aiClient = openai.NewClient(cfg.AIAPIKey)
	}

	// Infrastructure layer: JWT Service
	jwtService := auth.NewJwtService(cfg.JWTSecretCurrent, cfg.JWTAccessExpireMinutes, cfg.JWTRefreshExpireMinutes, "access", 1)

	if aiClient == nil {
		log.Println("Warning: AI client not initialized (AI_API_KEY not set)")
	}

	aiService := infraai.NewAIService(aiClient)

	// Use case layer
	wordUseCase := usecase.NewWordUseCase(wordRepo, aiService, vocabDailyStatsRepo, wordQuizRepo, aiPendingJobRepo)
	reviewUseCase := usecase.NewReviewUseCase(reviewRepo, wordRepo, vocabDailyStatsRepo)

	aiWorker := worker.NewAIRetryWorker(aiPendingJobRepo, aiService, wordQuizRepo, wordRepo, 2*time.Minute)
	go aiWorker.Start(appCtx)
	sessionUseCase := usecase.NewSessionUseCase(reviewQueueRepo, wordStatsRepo, reviewRepo, wordRepo, wordQuizRepo)
	authUseCase := usecase.NewAuthUseCase(userRepo, jwtService, refreshSessionRepo, cfg.GoogleClientID)
	calendarStatsUseCase := usecase.NewCalendarStatsUseCase(vocabDailyStatsRepo)
	wordQuizUseCase := usecase.NewWordQuizUseCase(wordQuizRepo, wordRepo)
	topicUseCase := usecase.NewTopicUseCase(wordRepo)
	adminUseCase := usecase.NewAdminUseCase(userRepo, adminStatsRepo)

	// Presentation layer: HTTP handlers
	handler := httphandler.NewHandler(wordUseCase, reviewUseCase, sessionUseCase, authUseCase, calendarStatsUseCase, wordQuizUseCase, topicUseCase, adminUseCase)

	// Router setup
	r := httphandler.NewRouter(handler, jwtService)

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	server := &stdhttp.Server{
		Addr:    addr,
		Handler: r,
	}

	serverErrors := make(chan error, 1)
	go func() {
		log.Printf("Server starting on %s", addr)
		serverErrors <- server.ListenAndServe()
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-serverErrors:
		if err != nil && err != stdhttp.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	case <-stop:
		log.Println("Shutdown signal received")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}
}
