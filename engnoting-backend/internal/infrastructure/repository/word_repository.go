package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/lib/pq"
	"github.com/sonsonha/eng-noting/internal/domain"
)

// WordRepository implements domain.WordRepository using PostgreSQL
type WordRepository struct {
	db *sql.DB
}

// NewWordRepository creates a new WordRepository
func NewWordRepository(db *sql.DB) *WordRepository {
	return &WordRepository{db: db}
}

// Update word
func (r *WordRepository) Update(ctx context.Context, word *domain.Word) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE words SET text = $1, context = $2, updated_at = $3 WHERE id = $4 AND user_id = $5
	`, word.Text, word.Context, word.UpdatedAt, word.ID, word.UserID)
	if err != nil {
		if isPgUniqueViolation(err) {
			return domain.ErrWordAlreadyExists
		}
		if isPgForeignKeyViolation(err) {
			return domain.ErrUserNotFound
		}
		return err
	}
	return nil
}

func isPgUniqueViolation(err error) bool {
	var pgErr *pq.Error
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

func isPgForeignKeyViolation(err error) bool {
	var pgErr *pq.Error
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23503"
	}
	return false
}

// Create creates a new word
func (r *WordRepository) Create(ctx context.Context, word *domain.Word) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO words (id, user_id, text, context, confidence, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, word.ID, word.UserID, word.Text, word.Context, word.Confidence, word.CreatedAt, word.UpdatedAt)
	if err != nil {
		if isPgUniqueViolation(err) {
			return domain.ErrWordAlreadyExists
		}
		if isPgForeignKeyViolation(err) {
			return domain.ErrUserNotFound
		}
		return err
	}
	return nil
}

// GetByID retrieves a word by ID
func (r *WordRepository) GetByID(ctx context.Context, wordID, userID string) (*domain.Word, error) {
	var word domain.Word
	var createdAt, updatedAt sql.NullTime

	var aiDefinition, aiExampleGood sql.NullString
	var aiPOS, aiCEFR, aiVIMeaning sql.NullString

	err := r.db.QueryRowContext(ctx, `
		SELECT
			w.id,
			w.user_id,
			w.text,
			w.context,
			w.source,
			w.confidence,
			w.created_at,
			w.updated_at,
			ai.definition,
			ai.example_good,
			ai.pos,
			ai.cefr_level,
			ai.vi_meaning
		FROM words w
		LEFT JOIN word_ai_data ai ON ai.word_id = w.id
		WHERE w.id = $1 AND w.user_id = $2
	`, wordID, userID).Scan(
		&word.ID,
		&word.UserID,
		&word.Text,
		&word.Context,
		&word.Source,
		&word.Confidence,
		&createdAt,
		&updatedAt,
		&aiDefinition,
		&aiExampleGood,
		&aiPOS,
		&aiCEFR,
		&aiVIMeaning,
	)

	if err == sql.ErrNoRows {
		return nil, domain.ErrWordNotFound
	}
	if err != nil {
		return nil, err
	}

	if createdAt.Valid {
		word.CreatedAt = createdAt.Time
	}
	if updatedAt.Valid {
		word.UpdatedAt = updatedAt.Time
	}

	// Set AI data if available
	if aiDefinition.Valid {
		word.AIData = &domain.WordAIData{
			WordID:      wordID,
			Definition:  aiDefinition.String,
			ExampleGood: aiExampleGood.String,
			GeneratedAt: time.Now(),
		}
		if aiPOS.Valid {
			word.AIData.PartOfSpeech = &aiPOS.String
		}
		if aiCEFR.Valid {
			word.AIData.CEFRLevel = &aiCEFR.String
		}
		if aiVIMeaning.Valid {
			word.AIData.VIMeaning = &aiVIMeaning.String
		}
	}

	return &word, nil
}

// List retrieves a list of words for a user
func (r *WordRepository) List(ctx context.Context, userID string, limit, offset int) ([]*domain.Word, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT
			w.id,
			w.user_id,
			w.text,
			w.context,
			w.source,
			w.confidence,
			w.created_at,
			w.updated_at,
			ai.definition,
			ai.example_good,
			ai.pos,
			ai.cefr_level,
			ai.vi_meaning
		FROM words w
		LEFT JOIN word_ai_data ai ON ai.word_id = w.id
		WHERE w.user_id = $1
		ORDER BY w.created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var words []*domain.Word
	for rows.Next() {
		var word domain.Word
		var createdAt, updatedAt sql.NullTime
		var aiDefinition, aiExampleGood sql.NullString
		var aiPOS, aiCEFR, aiVIMeaning sql.NullString

		err := rows.Scan(
			&word.ID,
			&word.UserID,
			&word.Text,
			&word.Context,
			&word.Source,
			&word.Confidence,
			&createdAt,
			&updatedAt,
			&aiDefinition,
			&aiExampleGood,
			&aiPOS,
			&aiCEFR,
			&aiVIMeaning,
		)
		if err != nil {
			continue
		}

		if createdAt.Valid {
			word.CreatedAt = createdAt.Time
		}
		if updatedAt.Valid {
			word.UpdatedAt = updatedAt.Time
		}

		if aiDefinition.Valid {
			aiData := &domain.WordAIData{
				WordID:      word.ID,
				Definition:  aiDefinition.String,
				ExampleGood: aiExampleGood.String,
				GeneratedAt: time.Now(),
			}
			if aiPOS.Valid {
				aiData.PartOfSpeech = &aiPOS.String
			}
			if aiCEFR.Valid {
				aiData.CEFRLevel = &aiCEFR.String
			}
			if aiVIMeaning.Valid {
				aiData.VIMeaning = &aiVIMeaning.String
			}
			word.AIData = aiData
		}

		words = append(words, &word)
	}

	return words, nil
}

// Count returns the total count of words for a user
func (r *WordRepository) Count(ctx context.Context, userID string) (int, error) {
	var total int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM words WHERE user_id = $1
	`, userID).Scan(&total)
	return total, err
}

// StoreAIData stores AI-generated data for a word
func (r *WordRepository) StoreAIData(ctx context.Context, wordID string, aiData *domain.WordAIData) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO word_ai_data (
			word_id,
			definition,
			example_good,
			pos,
			cefr_level,
			vi_meaning,
			generated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (word_id) DO NOTHING
	`,
		wordID,
		aiData.Definition,
		aiData.ExampleGood,
		aiData.PartOfSpeech,
		aiData.CEFRLevel,
		aiData.VIMeaning,
		time.Now(),
	)
	return err
}
