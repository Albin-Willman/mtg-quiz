import { useRef, useEffect } from 'react'

export default function ClueButton({ label, checkGuess, renderValue, state, onUpdate, wide, gameOver }) {
  const { status, lastGuess, inputVal } = state
  const inputRef = useRef(null)

  useEffect(() => {
    if (status === 'guessing') inputRef.current?.focus()
  }, [status])

  const submit = (e) => {
    e?.preventDefault()
    const g = inputVal.trim()
    if (!g) return
    onUpdate({ status: checkGuess(g) ? 'correct' : 'wrong', lastGuess: g, inputVal: '' })
  }

  const cls = [
    'clue-item',
    wide && 'clue-item--wide',
    `clue-item--${status}`,
  ].filter(Boolean).join(' ')

  if (status === 'idle') {
    return (
      <div className={cls}>
        <button className="clue-main-btn" onClick={() => onUpdate({ status: 'guessing' })}>
          Guess {label}
        </button>
        <button
          className="clue-reveal-btn"
          onClick={() => onUpdate({ status: 'revealed' })}
          title="Reveal without guessing"
        >
          Reveal
        </button>
      </div>
    )
  }

  if (status === 'guessing') {
    return (
      <div className={cls}>
        <form className="clue-guess-form" onSubmit={submit}>
          <input
            ref={inputRef}
            className="clue-guess-input"
            value={inputVal}
            onChange={(e) => onUpdate({ inputVal: e.target.value })}
            placeholder={`${label}…`}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            className="clue-action-btn clue-action-btn--confirm"
            disabled={!inputVal.trim()}
            title="Submit guess"
          >
            ✓
          </button>
          <button
            type="button"
            className="clue-action-btn clue-action-btn--reveal"
            onClick={() => onUpdate({ status: 'revealed' })}
            title="Reveal"
          >
            ↓
          </button>
        </form>
      </div>
    )
  }

  if (status === 'wrong') {
    return (
      <div className={cls}>
        <span className="clue-wrong-label">✗ &ldquo;{lastGuess}&rdquo;</span>
        <span className="clue-value clue-value--answer">{renderValue()}</span>
        {!gameOver && (
          <button
            className="clue-sm-btn"
            onClick={() => onUpdate({ status: 'guessing', inputVal: '' })}
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  // correct | revealed
  return (
    <div className={cls}>
      {status === 'correct' && <span className="clue-correct-icon">✓&nbsp;</span>}
      <span className="clue-value">{renderValue()}</span>
    </div>
  )
}
