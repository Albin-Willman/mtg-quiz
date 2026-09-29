import { useState } from 'react'
import SetPicker from './SetPicker'

const COUNT_OPTIONS = [5, 10, 20]

export default function QuizSetup({ onStart, onBuild }) {
  const [selectedSet, setSelectedSet] = useState(null)
  const [cardCount, setCardCount] = useState(10)

  const handleSubmit = (e) => {
    e.preventDefault()
    onStart({ set: selectedSet, cardCount })
  }

  return (
    <form className="quiz-setup" onSubmit={handleSubmit}>
      <h2 className="quiz-setup-title">New Quiz</h2>
      <div className="quiz-setup-field">
        <label className="quiz-setup-label">Set (optional)</label>
        <SetPicker value={selectedSet} onChange={setSelectedSet} />
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
