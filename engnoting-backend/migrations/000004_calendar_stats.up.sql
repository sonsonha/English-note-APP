CREATE TABLE vocab_daily_stats (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    added_words_count INTEGER NOT NULL DEFAULT 0,
    reviewed_words_count INTEGER NOT NULL DEFAULT 0,
    accuracy_rate FLOAT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'fallow',
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, stat_date)
);

CREATE INDEX idx_vocab_daily_stats_user_date ON vocab_daily_stats(user_id, stat_date);
