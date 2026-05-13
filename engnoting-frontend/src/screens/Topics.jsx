import { useState, useEffect } from 'react';
import Icon from '../components/Icons.jsx';
import { getTopics, getTopicWords } from '../api/topics.js';

const TOPIC_META = {
  technology:   { label: 'Technology',    emoji: '💻', color: 'var(--accent)' },
  food:         { label: 'Food & Cooking', emoji: '🍳', color: '#e67e22' },
  travel:       { label: 'Travel',         emoji: '✈️', color: '#2980b9' },
  health:       { label: 'Health',         emoji: '🏥', color: '#27ae60' },
  business:     { label: 'Business',       emoji: '💼', color: '#8e44ad' },
  education:    { label: 'Education',      emoji: '📚', color: '#2c3e50' },
  entertainment:{ label: 'Entertainment',  emoji: '🎬', color: '#c0392b' },
  nature:       { label: 'Nature',         emoji: '🌿', color: '#16a085' },
  society:      { label: 'Society',        emoji: '🏛️', color: '#d35400' },
  science:      { label: 'Science',        emoji: '🔬', color: '#1abc9c' },
  arts:         { label: 'Arts',           emoji: '🎨', color: '#e91e63' },
  sports:       { label: 'Sports',         emoji: '⚽', color: '#f39c12' },
  daily_life:   { label: 'Daily Life',     emoji: '🏠', color: '#7f8c8d' },
  academic:     { label: 'Academic',       emoji: '🎓', color: '#34495e' },
  emotion:      { label: 'Emotion',        emoji: '💭', color: '#9b59b6' },
  finance:      { label: 'Finance',        emoji: '💰', color: '#f1c40f' },
  history:      { label: 'History',        emoji: '🏺', color: '#795548' },
  environment:  { label: 'Environment',    emoji: '🌍', color: '#4caf50' },
  family:       { label: 'Family',         emoji: '👨‍👩‍👧', color: '#ff7043' },
  law:          { label: 'Law',            emoji: '⚖️', color: '#607d8b' },
};

function getTopicMeta(topic) {
  return TOPIC_META[topic] || { label: topic, emoji: '📝', color: 'var(--accent)' };
}

function TopicCard({ topic, wordCount, isSelected, onClick }) {
  const meta = getTopicMeta(topic);
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        padding: '18px 20px', borderRadius: 16, border: 'none', cursor: 'pointer',
        background: isSelected ? meta.color : 'var(--paper-2)',
        outline: isSelected ? 'none' : `1.5px solid var(--paper-edge)`,
        transition: 'all 0.15s',
        color: isSelected ? '#fff' : 'var(--ink)',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 28, marginBottom: 10, lineHeight: 1 }}>{meta.emoji}</span>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
        {meta.label}
      </div>
      <div style={{ fontSize: 11, marginTop: 6, opacity: isSelected ? 0.85 : 0.6, fontWeight: 600 }}>
        {wordCount} word{wordCount !== 1 ? 's' : ''}
      </div>
    </button>
  );
}

function WordRow({ word, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
        borderRadius: 12, border: 'none', cursor: 'pointer',
        background: 'var(--paper-2)', width: '100%', textAlign: 'left',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--paper-edge)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--paper-2)'}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16 }}>{word.text}</div>
        {word.definition && (
          <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2, lineHeight: 1.4 }}>
            {word.definition.length > 80 ? word.definition.slice(0, 80) + '…' : word.definition}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        {word.cefr_level && (
          <span className="tag" style={{ fontSize: 10, padding: '2px 7px' }}>{word.cefr_level}</span>
        )}
        {word.vi_meaning && (
          <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>{word.vi_meaning}</span>
        )}
        <Icon name="chevR" size={13} />
      </div>
    </button>
  );
}

export default function Topics({ openWord, goToReview }) {
  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [words, setWords] = useState([]);
  const [loadingWords, setLoadingWords] = useState(false);

  useEffect(() => {
    setLoadingTopics(true);
    getTopics()
      .then(d => setTopics(d?.topics || []))
      .catch(() => setTopics([]))
      .finally(() => setLoadingTopics(false));
  }, []);

  useEffect(() => {
    if (!selectedTopic) { setWords([]); return; }
    setLoadingWords(true);
    getTopicWords(selectedTopic, 100, 0)
      .then(d => setWords(d?.words || []))
      .catch(() => setWords([]))
      .finally(() => setLoadingWords(false));
  }, [selectedTopic]);

  const selectedMeta = selectedTopic ? getTopicMeta(selectedTopic) : null;

  return (
    <div className="canvas fade-in" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <div className="kicker">Browse</div>
          <h1 style={{ marginTop: 8 }}>Topics</h1>
        </div>
      </div>

      {loadingTopics ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-faint)', fontSize: 14, marginTop: 20 }}>
          <div className="spinner" style={{ width: 16, height: 16 }} /> Loading topics…
        </div>
      ) : topics.length === 0 ? (
        <div className="card" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📚</div>
          <h3 style={{ margin: 0 }}>No topics yet</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            Add new words — they'll be automatically classified into topics by AI.
          </p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 10,
            marginBottom: 28,
          }}>
            {topics.map(t => (
              <TopicCard
                key={t.topic}
                topic={t.topic}
                wordCount={t.word_count}
                isSelected={selectedTopic === t.topic}
                onClick={() => setSelectedTopic(selectedTopic === t.topic ? null : t.topic)}
              />
            ))}
          </div>

          {selectedTopic && (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{selectedMeta?.emoji}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18 }}>
                      {selectedMeta?.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                      {words.length} word{words.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ padding: '10px 18px' }}
                  onClick={() => goToReview({ topic: selectedTopic, limit: 20, label: selectedMeta?.label })}
                >
                  <Icon name="play" size={13} /> Review topic
                </button>
              </div>

              {loadingWords ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-faint)', fontSize: 14, padding: '16px 0' }}>
                  <div className="spinner" style={{ width: 14, height: 14 }} /> Loading words…
                </div>
              ) : words.length === 0 ? (
                <div className="muted" style={{ padding: '16px 0', fontSize: 14 }}>No words found in this topic.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {words.map(w => (
                    <WordRow key={w.id} word={w} onClick={() => openWord(w.id)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
