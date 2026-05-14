package ai

import "fmt"

const systemPrompt = `You are an English teacher. Return a JSON object only.
Required keys:
- definition: concise English definition
- example_good: a correct example sentence
- vi_meaning: short Vietnamese translation (1-5 words)
- topic: classify the word into exactly one of these categories: technology, food, travel, health, business, education, entertainment, nature, society, science, arts, sports, daily_life, academic, emotion, finance, history, environment, family, law
- pronunciation: IPA transcription in /slashes/, e.g. /ɪɡˈzæmpəl/
Optional keys:
- part_of_speech: noun/verb/adjective/etc
- cefr_level: A1/A2/B1/B2/C1/C2
Do not include extra text outside JSON.`

func buildUserPrompt(word, context string) string {
	if context == "" {
		return fmt.Sprintf("Word: %s\nProvide the JSON response.", word)
	}
	return fmt.Sprintf("Word: %s\nContext: %s\nProvide the JSON response.", word, context)
}

// systemPromptAllQuizzes generates all 6 quiz levels for a word in a single call.
// Level progression (recognition → production):
//   L1 word_meaning_mcq  — given the English word, choose its Vietnamese meaning
//   L2 context_fill_mcq  — given a sentence with a blank, choose the correct English word
//   L3 phrase_match       — choose the phrase that best captures the word's meaning
//   L4 reverse_mcq        — given the Vietnamese meaning, choose the correct English word
//   L5 recall_typing      — given the Vietnamese meaning, type the English word
//   L6 context_typing     — given a sentence with a blank, type the English word
const systemPromptAllQuizzes = `You are a vocabulary learning specialist. Generate exactly 6 quiz questions for the target word — one of each type below.

Return a JSON object with key "quizzes" containing an array of exactly 6 objects — no extra text outside JSON.

--- QUIZ TYPES ---

1. "word_meaning_mcq"
   - question: "What does '[word]' mean?" (replace [word] with the actual target word)
   - choices: 4 Vietnamese translations — 1 correct short meaning (1–4 words), 3 plausible but wrong Vietnamese words/phrases from the same semantic field
   - answer: the correct Vietnamese meaning (must match one choice exactly)

2. "context_fill_mcq"
   - question: A vivid, natural English sentence (12–20 words) that uses the word, with ___ replacing it
   - choices: 4 English words — the target word + 3 semantically similar distractors of the same part of speech; the wrong ones must NOT fit the sentence naturally
   - answer: the target word (must match one choice exactly)

3. "phrase_match"
   - question: "Which phrase best captures the meaning of '[word]'?" (replace [word] with the actual target word)
   - choices: 4 natural English phrases (3–6 words each) — 1 correct, 3 plausible but subtly wrong (they describe related but distinct concepts)
   - answer: the correct phrase (must match one choice exactly)

4. "reverse_mcq"
   - question: The Vietnamese meaning of the word (same text as quiz 1's correct answer)
   - choices: 4 English words — the target word + 3 semantically related English distractors
   - answer: the target word (must match one choice exactly)

5. "recall_typing"
   - question: The Vietnamese meaning of the word (same text as quiz 1's correct answer)
   - choices: [] (empty array)
   - answer: the target word

6. "context_typing"
   - question: A DIFFERENT vivid sentence from quiz 2 (12–20 words), with ___ replacing the target word; use a different context or situation so both sentences provide learning value
   - choices: [] (empty array)
   - answer: the target word

--- GUIDELINES ---
- The Vietnamese meaning must be accurate and consistent across quizzes 1, 4, and 5.
- All MCQ distractors must come from the same semantic category or part of speech — they must make a thoughtful learner pause.
- Sentences (quizzes 2 and 6) must sound like authentic English speech or writing, not textbook examples.
- The answer field for MCQ quizzes must exactly match one of the choices (same capitalisation and spelling).

Output format for each quiz object:
{
  "quiz_type": "...",
  "question": "...",
  "choices": ["...", "...", "...", "..."],
  "answer": "..."
}`

func buildUserPromptQuiz(word, context string) string {
	if context == "" {
		return fmt.Sprintf("Target word: %s\nGenerate the quizzes now.", word)
	}
	return fmt.Sprintf("Target word: %s\nLearner's original context: \"%s\"\nGenerate the quizzes now.", word, context)
}
