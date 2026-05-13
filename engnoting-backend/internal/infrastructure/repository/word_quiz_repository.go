package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/sonsonha/eng-noting/internal/domain"
)

type WordQuizRepository struct {
	db *sql.DB
}

func NewWordQuizRepository(db *sql.DB) *WordQuizRepository {
	return &WordQuizRepository{db: db}
}

func (r *WordQuizRepository) StoreQuizzes(ctx context.Context, quizzes []domain.WordQuiz) error {
	for _, q := range quizzes {
		choicesJSON, err := json.Marshal(q.Choices)
		if err != nil {
			return err
		}
		_, err = r.db.ExecContext(ctx, `
			INSERT INTO word_quizzes (word_id, quiz_type, question, choices, answer, generated_at)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (word_id, quiz_type) DO UPDATE
			SET question = EXCLUDED.question,
			    choices  = EXCLUDED.choices,
			    answer   = EXCLUDED.answer,
			    generated_at = EXCLUDED.generated_at
		`, q.WordID, q.QuizType, q.Question, choicesJSON, q.Answer, q.GeneratedAt)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *WordQuizRepository) GetByWordID(ctx context.Context, wordID string) ([]domain.WordQuiz, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT word_id, quiz_type, question, choices, answer, generated_at
		FROM word_quizzes
		WHERE word_id = $1
		ORDER BY quiz_type
	`, wordID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var quizzes []domain.WordQuiz
	for rows.Next() {
		var q domain.WordQuiz
		var choicesRaw []byte
		var generatedAt sql.NullTime

		if err := rows.Scan(&q.WordID, &q.QuizType, &q.Question, &choicesRaw, &q.Answer, &generatedAt); err != nil {
			return nil, err
		}
		if generatedAt.Valid {
			q.GeneratedAt = generatedAt.Time
		}
		if err := json.Unmarshal(choicesRaw, &q.Choices); err != nil {
			q.Choices = []string{}
		}
		quizzes = append(quizzes, q)
	}
	return quizzes, rows.Err()
}

func (r *WordQuizRepository) HasAdvancedQuizzes(ctx context.Context, wordID string) (bool, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM word_quizzes
		WHERE word_id = $1 AND quiz_type IN ('fill_blank', 'typing')
	`, wordID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func aiQuizzesToWordQuizzes(wordID string, quizzes []domain.AIQuiz) []domain.WordQuiz {
	now := time.Now()
	result := make([]domain.WordQuiz, len(quizzes))
	for i, q := range quizzes {
		choices := q.Choices
		if choices == nil {
			choices = []string{}
		}
		result[i] = domain.WordQuiz{
			WordID:      wordID,
			QuizType:    q.QuizType,
			Question:    q.Question,
			Choices:     choices,
			Answer:      q.Answer,
			GeneratedAt: now,
		}
	}
	return result
}
