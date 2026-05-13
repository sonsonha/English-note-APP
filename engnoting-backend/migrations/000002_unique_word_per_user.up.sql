-- 1. normalize (optional nhưng nên làm)
UPDATE words SET text = LOWER(TRIM(text));

-- 2. remove duplicates
DELETE FROM words w1
USING words w2
WHERE 
    w1.user_id = w2.user_id
    AND w1.text = w2.text
    AND w1.created_at < w2.created_at;

-- 3. add constraint
CREATE UNIQUE INDEX unique_user_word ON words (user_id, lower(trim(text)));
