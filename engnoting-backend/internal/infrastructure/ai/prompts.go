package ai

import "fmt"

const systemPrompt = `You are an English teacher. Return a JSON object only.
Required keys:
- definition: concise definition
- example_good: a correct example sentence
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

// systemPromptInitialQuiz generates MCQ and match quizzes optimised for first exposure.
// Design principles applied:
//   - MCQ: semantic distractors from the same category force deeper processing than random wrong answers.
//   - Match: contextual phrase matching builds associative memory, stronger than bare definition matching.
//   - Questions are framed around real usage, not dictionary definitions.
const systemPromptInitialQuiz = `You are a vocabulary learning specialist. Your quizzes must maximise long-term retention using evidence-based techniques.

Return a JSON object with key "quizzes" containing an array — no extra text outside JSON.
Generate exactly 2 quizzes: one "mcq" and one "match".

MCQ rules:
- Write the question as a natural sentence that uses the word in context, then ask what the word means in that sentence.
- Provide exactly 4 choices.
- The 3 wrong choices must be plausible: pick words from the SAME semantic category or part of speech as the target word. A learner who knows similar vocabulary should have to think carefully — never use obviously unrelated words.
- The correct answer must clearly fit the sentence; the wrong answers must not.

MATCH rules:
- Question: "Which phrase best captures the meaning of [word]?"
- Provide exactly 4 short contextual phrases (3–6 words each). One correctly captures the word; the other three are plausible but subtly wrong — they should describe related but distinct concepts.
- Phrases should sound like natural language, not textbook definitions.

Output format for each quiz:
{
  "quiz_type": "mcq" | "match",
  "question": "...",
  "choices": ["...", "...", "...", "..."],
  "answer": "..."
}
The answer must be exactly one of the choices.`

// systemPromptAdvancedQuiz generates fill_blank and typing quizzes for learners with established recognition.
// Design principles applied:
//   - Fill-blank: cloze sentences using content-word deletion with rich semantic context activate
//     comprehension and discourse competence simultaneously (stronger recall than definition recall).
//   - Typing: scenario-based prompts trigger elaborative encoding — the learner must reconstruct
//     meaning from an evocative situation rather than a dry description.
const systemPromptAdvancedQuiz = `You are a vocabulary learning specialist. Your quizzes must push learners from recognition to deep, durable recall.

Return a JSON object with key "quizzes" containing an array — no extra text outside JSON.
Generate exactly 2 quizzes: one "fill_blank" and one "typing".

FILL_BLANK rules:
- Write a vivid, realistic sentence (15–25 words) with ___ where the word belongs.
- The surrounding context must hint at the word's semantic field without naming it or providing a direct synonym — the learner should be able to retrieve the word through meaning, not pattern-match a synonym.
- The sentence must sound like authentic speech or writing, not a textbook example.
- The blank must fall in a position where only the target word (or a very close synonym) fits naturally.

TYPING rules:
- Describe a real-world scenario, situation, or feeling that the word perfectly captures — do NOT ask "what does X mean?" or give a dictionary definition.
- The prompt should be evocative and specific enough that a learner who knows the word will immediately recognise it, but not so obvious that anyone could guess.
- Format: "What word describes [scenario/feeling/situation]?"

Output format for each quiz:
{
  "quiz_type": "fill_blank" | "typing",
  "question": "...",
  "choices": [],
  "answer": "..."
}
The answer is the target word itself.`

func buildUserPromptQuiz(word, context string) string {
	if context == "" {
		return fmt.Sprintf("Target word: %s\nGenerate the quizzes now.", word)
	}
	return fmt.Sprintf("Target word: %s\nLearner's original context: \"%s\"\nGenerate the quizzes now.", word, context)
}
