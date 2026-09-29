import { useState } from 'react'

const ICONS = { correct: '✓', wrong: '✗', skipped: '↷' }

export default function QuizSummary({ history, onPlayAgain, onNewQuiz }) {
  const [copied, setCopied] = useState(false)
  const totalEarned = history.reduce((s, r) => s + r.roundPoints, 0)
  const totalMax = history.reduce((s, r) => s + r.maxPoints, 0)

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="quiz-summary">
      <div className="summary-header">
        <h2 className="quiz-summary-title">Quiz Complete!</h2>
        <button className="share-btn" onClick={handleShare}>
          {copied ? 'Copied!' : 'Share Quiz'}
        </button>
      </div>
      <div className="summary-score">
        <span className="summary-score-earned">{totalEarned}</span>
        <span className="summary-score-sep"> / </span>
        <span className="summary-score-max">{totalMax}</span>
        <span className="summary-score-label"> pts</span>
      </div>
      <ul className="summary-list">
        {history.map((r, i) => (
          <li key={r.cardId + i} className={`summary-row summary-row--${r.result}`}>
            <span className="summary-row-icon">{ICONS[r.result]}</span>
            <span className="summary-row-name">{r.cardName}</span>
            <span className="summary-row-pts">+{r.roundPoints}</span>
          </li>
        ))}
      </ul>
      <div className="summary-actions">
        <button className="btn-primary" onClick={onPlayAgain}>
          Play Again
        </button>
        <button className="btn-ghost" onClick={onNewQuiz}>
          New Quiz
        </button>
      </div>
    </div>
  )
}
