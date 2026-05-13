package worker

import (
	"context"
	"log"
	"time"

	"github.com/sonsonha/eng-noting/internal/domain"
)

type AIRetryWorker struct {
	jobRepo  domain.AIPendingJobRepository
	aiSvc    domain.AIService
	quizRepo domain.WordQuizRepository
	wordRepo domain.WordRepository
	interval time.Duration
}

func NewAIRetryWorker(
	jobRepo domain.AIPendingJobRepository,
	aiSvc domain.AIService,
	quizRepo domain.WordQuizRepository,
	wordRepo domain.WordRepository,
	interval time.Duration,
) *AIRetryWorker {
	return &AIRetryWorker{
		jobRepo:  jobRepo,
		aiSvc:    aiSvc,
		quizRepo: quizRepo,
		wordRepo: wordRepo,
		interval: interval,
	}
}

func (w *AIRetryWorker) Start(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()
	log.Printf("[INFO] AIRetryWorker started, polling every %s", w.interval)
	for {
		select {
		case <-ctx.Done():
			log.Println("[INFO] AIRetryWorker stopped")
			return
		case <-ticker.C:
			w.processDueJobs(ctx)
		}
	}
}

func (w *AIRetryWorker) processDueJobs(ctx context.Context) {
	jobs, err := w.jobRepo.FetchDue(ctx, 10)
	if err != nil {
		log.Printf("[WARN] AIRetryWorker: failed to fetch due jobs: %v", err)
		return
	}
	for _, job := range jobs {
		w.processJob(ctx, job)
	}
}

func (w *AIRetryWorker) processJob(ctx context.Context, job domain.AIPendingJob) {
	var processErr error
	switch job.JobType {
	case domain.AIJobTypeExplainWord:
		processErr = w.processExplainWord(ctx, job)
	case domain.AIJobTypeInitialQuizzes:
		processErr = w.processInitialQuizzes(ctx, job)
	case domain.AIJobTypeAdvancedQuizzes:
		processErr = w.processAdvancedQuizzes(ctx, job)
	default:
		log.Printf("[WARN] AIRetryWorker: unknown job type %q for job %s, skipping", job.JobType, job.ID)
		_ = w.jobRepo.MarkDone(ctx, job.ID)
		return
	}

	if processErr != nil {
		log.Printf("[WARN] AIRetryWorker: job %s (%s %q) failed (attempt %d): %v",
			job.ID, job.JobType, job.WordText, job.Attempts+1, processErr)
		_ = w.jobRepo.RecordAttempt(ctx, job.ID, processErr.Error())
	} else {
		log.Printf("[INFO] AIRetryWorker: job %s (%s %q) completed", job.ID, job.JobType, job.WordText)
		_ = w.jobRepo.MarkDone(ctx, job.ID)
	}
}

func (w *AIRetryWorker) processExplainWord(ctx context.Context, job domain.AIPendingJob) error {
	exp, err := w.aiSvc.ExplainWord(job.WordText, job.WordContext)
	if err != nil {
		return err
	}
	aiData := &domain.WordAIData{
		WordID:       job.WordID,
		Definition:   exp.Definition,
		ExampleGood:  exp.ExampleGood,
		PartOfSpeech: &exp.PartOfSpeech,
		CEFRLevel:    &exp.CEFRLevel,
		GeneratedAt:  time.Now(),
	}
	return w.wordRepo.StoreAIData(ctx, job.WordID, aiData)
}

func (w *AIRetryWorker) processInitialQuizzes(ctx context.Context, job domain.AIPendingJob) error {
	quizzes, err := w.aiSvc.GenerateInitialQuizzes(job.WordText, job.WordContext)
	if err != nil {
		return err
	}
	return w.storeQuizzes(ctx, job.WordID, quizzes)
}

func (w *AIRetryWorker) processAdvancedQuizzes(ctx context.Context, job domain.AIPendingJob) error {
	exists, err := w.quizRepo.HasAdvancedQuizzes(ctx, job.WordID)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	quizzes, err := w.aiSvc.GenerateAdvancedQuizzes(job.WordText, job.WordContext)
	if err != nil {
		return err
	}
	return w.storeQuizzes(ctx, job.WordID, quizzes)
}

func (w *AIRetryWorker) storeQuizzes(ctx context.Context, wordID string, quizzes []domain.AIQuiz) error {
	wq := make([]domain.WordQuiz, len(quizzes))
	for i, q := range quizzes {
		choices := q.Choices
		if choices == nil {
			choices = []string{}
		}
		wq[i] = domain.WordQuiz{
			WordID:   wordID,
			QuizType: q.QuizType,
			Question: q.Question,
			Choices:  choices,
			Answer:   q.Answer,
		}
	}
	return w.quizRepo.StoreQuizzes(ctx, wq)
}
