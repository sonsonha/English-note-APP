CREATE TABLE word_quizzes (
    word_id   UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    quiz_type TEXT NOT NULL,
    question  TEXT NOT NULL,
    choices   JSONB NOT NULL DEFAULT '[]',
    answer    TEXT NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (word_id, quiz_type)
);
