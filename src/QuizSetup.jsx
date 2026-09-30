import { useState } from 'react'
import SetPicker from './SetPicker'

const COUNT_OPTIONS = [5, 10, 20]

const CARD_TYPES = [
  'Creature', 'Instant', 'Sorcery', 'Enchantment',
  'Artifact', 'Planeswalker', 'Land', 'Battle',
]

const FORMATS = ['Standard', 'Pioneer', 'Modern', 'Legacy', 'Vintage', 'Pauper']

export default function QuizSetup({ onStart, onBuild }) {
  const [selectedSet, setSelectedSet] = useState(null)
  const [cardCount, setCardCount] = useState(10)
  const [cardType, setCardType] = useState(null)
  const [cardFormat, setCardFormat] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    onStart({ set: selectedSet, cardCount, type: cardType, format: cardFormat })
  }

  return (
    <form className="quiz-setup" onSubmit={handleSubmit}>
      <h2 className="quiz-setup-title">New Quiz</h2>
      <div className="quiz-setup-field">
        <label className="quiz-setup-label">Set (optional)</label>
        <SetPicker
          value={selectedSet}
          onChange={(s) => { setSelectedSet(s); if (s) setCardFormat(null) }}
          disabled={!!cardFormat}
        />
      </div>
      <div className="quiz-setup-row">
        <div className="quiz-setup-field">
          <label className="quiz-setup-label">Type (optional)</label>
          <div className="type-picker-wrapper">
            <select
              className="type-picker-select"
              value={cardType ?? ''}
              onChange={(e) => setCardType(e.target.value || null)}
            >
              <option value="">Any</option>
              {CARD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="quiz-setup-field">
          <label className="quiz-setup-label">Format (optional)</label>
          <div className="type-picker-wrapper">
            <select
              className="type-picker-select"
              value={cardFormat ?? ''}
              onChange={(e) => { const v = e.target.value || null; setCardFormat(v); if (v) setSelectedSet(null) }}
              disabled={!!selectedSet}
            >
              <option value="">Any</option>
              {FORMATS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="quiz-setup-field">
        <label className="quiz-setup-label">Cards</label>
        <div className="quiz-count-options">
          {COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              className={`quiz-count-btn${cardCount === n ? ' quiz-count-btn--active' : ''}`}
              onClick={() => setCardCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <button type="submit" className="btn-primary">
        Start Quiz
      </button>
      <button type="button" className="btn-ghost btn-full" onClick={onBuild}>
        Build Custom Quiz
      </button>
    </form>
  )
}
