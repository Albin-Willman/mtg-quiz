import { useState, useRef, useEffect, useMemo } from 'react'
import useCard from './useCard'
import ManaSymbols from './ManaSymbols'
import ClueButton from './ClueButton'
import QuizSetup from './QuizSetup'
import QuizSummary from './QuizSummary'
import QuizBuilder from './QuizBuilder'
import { matchRules, describeRulesMatch } from './rulesMatch'
import './App.css'

const initClues = () => ({
  manaCost:  { status: 'idle', lastGuess: '', inputVal: '' },
  type:      { status: 'idle', lastGuess: '', inputVal: '' },
  power:     { status: 'idle', lastGuess: '', inputVal: '' },
  toughness: { status: 'idle', lastGuess: '', inputVal: '' },
  set:       { status: 'idle', lastGuess: '', inputVal: '' },
  rules:     { status: 'idle', lastGuess: '', inputVal: '' },
})

const revealAllClues = (prev) =>
  Object.fromEntries(
    Object.entries(prev).map(([k, v]) => [
      k,
      {
        ...v,
        status:
          v.status === 'correct' || v.status === 'wrong' ? v.status : 'revealed',
      },
    ])
  )

const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[—–]/g, '-')

const cluePoints = (clue) => {
  if (clue.status === 'correct') return 2
  if (clue.status === 'revealed') return 0
  return 1 // idle, guessing, or wrong — all tried or untouched
}

const cluePointsCorrectOnly = (clue) => clue.status === 'correct' ? 2 : 0

const calcCluePoints = (clues, selectedSet, scorer = cluePoints) => {
  let pts = scorer(clues.manaCost)
            + scorer(clues.type)
            + scorer(clues.power)
            + scorer(clues.toughness)
            + scorer(clues.rules)
  if (!selectedSet) pts += scorer(clues.set)
  return pts
}

const calcRoundPoints = (clues, selectedSet) =>
  2 + calcCluePoints(clues, selectedSet)

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const renderObfuscatedRules = (text, card) => {
  if (!text) return null
  const names = card.card_faces ? card.card_faces.map((f) => f.name) : [card.name]
  const pattern = new RegExp(`(${names.map(escapeRegex).join('|')})`, 'gi')
  return text.split(pattern).map((part, i) =>
    names.some((n) => n.toLowerCase() === part.toLowerCase())
      ? <span key={i} className="clue-card-name">{'{Card name}'}</span>
      : part
  )
}

// Parse quiz URL params once on load.
// Supports ?quiz=id1,id2,...&quizCount=10&quizSet=neo
// Also handles legacy ?card=id links by treating them as a 10-card quiz.
const parseInitialQuizInfo = () => {
  const p = new URLSearchParams(window.location.search)
  const quizParam = p.get('quiz')
  if (quizParam) {
    const quizIds = quizParam.split(',').filter(Boolean)
    const quizCount = parseInt(p.get('quizCount') ?? '0', 10) || quizIds.length
    return { quizIds, quizCount, quizSetCode: p.get('quizSet') ?? null }
  }
  const cardId = p.get('card')
  if (cardId) {
    return { quizIds: [cardId], quizCount: 10, quizSetCode: null }
  }
  return null
}

export default function App() {
  const initialQuizInfo = useMemo(parseInitialQuizInfo, [])

  // Preset card IDs — initialized from URL, overwritten when starting a builder quiz
  const [quizCardIds, setQuizCardIds] = useState(() => initialQuizInfo?.quizIds ?? [])

  const [quizPhase, setQuizPhase] = useState(() => initialQuizInfo ? 'playing' : 'setup')
  const [quizConfig, setQuizConfig] = useState(() =>
    initialQuizInfo
      ? {
          set: initialQuizInfo.quizSetCode ? { code: initialQuizInfo.quizSetCode } : null,
          cardCount: initialQuizInfo.quizCount,
          cardIds: initialQuizInfo.quizIds,
        }
      : { set: null, cardCount: 10 }
  )
  const [quizHistory, setQuizHistory] = useState([])
  const [quizCardIndex, setQuizCardIndex] = useState(0)

  const [selectedSet, setSelectedSet] = useState(() =>
    initialQuizInfo?.quizSetCode ? { code: initialQuizInfo.quizSetCode } : null
  )
  const [selectedType, setSelectedType] = useState(null)
  const [selectedFormat, setSelectedFormat] = useState(null)
  const [refetchKey, setRefetchKey] = useState(0)

  const { card, loading, error, fetchCard, fetchCardById } = useCard(selectedSet?.code, selectedType, selectedFormat)

  // Initial card fetch. quizCardIds[0] is always the right ID when this effect runs
  // because quizCardIndex is always 0 at mount and at quiz-start (handleStartQuiz resets it).
  // Subsequent cards are fetched directly from next(), not through this effect.
  useEffect(() => {
    if (quizPhase !== 'playing') return
    const controller = new AbortController()
    const specificId = quizCardIds[quizCardIndex]
    if (specificId) {
      fetchCardById(specificId, controller.signal)
    } else {
      fetchCard(controller.signal)
    }
    return () => controller.abort()
  }, [fetchCard, refetchKey, quizPhase])

  // Keep URL in sync with quiz progress.
  // During playing: ?quiz=id1,id2,...&quizCount=N (grows as rounds complete + current card)
  // After summary/setup: leave URL as-is so shared links remain valid.
  useEffect(() => {
    if (!card || quizPhase !== 'playing') return
    const ids = [...quizHistory.map((r) => r.cardId), card.id]
    const url = new URL(window.location.href)
    url.searchParams.set('quiz', ids.join(','))
    url.searchParams.set('quizCount', quizConfig.cardCount.toString())
    if (quizConfig.set?.code) url.searchParams.set('quizSet', quizConfig.set.code)
    else url.searchParams.delete('quizSet')
    url.searchParams.delete('card')
    window.history.replaceState(null, '', url)
  }, [card, quizPhase, quizHistory, quizConfig])

  const [guess, setGuess] = useState('')
  const [checkingGuess, setCheckingGuess] = useState(false)
  const [result, setResult] = useState(null) // null | 'correct' | 'wrong' | 'skipped'
  const [submittedGuess, setSubmittedGuess] = useState('')
  const [clues, setClues] = useState(initClues)
  const [score, setScore] = useState({ points: 0, rounds: 0 })
  const [roundPoints, setRoundPoints] = useState(0)
  const inputRef = useRef(null)
  const seenCardIdsRef = useRef(new Set())

  useEffect(() => {
    if (!loading && result === null && inputRef.current) {
      inputRef.current.focus()
    }
  }, [loading, result])

  const updateClue = (key, updates) =>
    setClues((prev) => ({ ...prev, [key]: { ...prev[key], ...updates } }))

  const handleStartQuiz = ({ set, cardCount, type = null, format = null, cardIds = [] }) => {
    setQuizCardIds(cardIds)
    setQuizConfig({ set, cardCount, type, format, cardIds })
    setSelectedSet(set)
    setSelectedType(type)
    setSelectedFormat(format)
    seenCardIdsRef.current = new Set()
    setQuizHistory([])
    setQuizCardIndex(0)
    setScore({ points: 0, rounds: 0 })
    setGuess('')
    setResult(null)
    setClues(initClues)
    setQuizPhase('playing')
    setRefetchKey((k) => k + 1)
  }

  const handlePlayAgain = () => handleStartQuiz(quizConfig)

  const handleNewQuiz = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('quiz')
    url.searchParams.delete('quizCount')
    url.searchParams.delete('quizSet')
    url.searchParams.delete('card')
    window.history.replaceState(null, '', url)
    setQuizPhase('setup')
    setQuizHistory([])
    setQuizCardIndex(0)
    setScore({ points: 0, rounds: 0 })
    setSelectedType(null)
    setSelectedFormat(null)
  }

  const submitGuess = async (e) => {
    e.preventDefault()
    if (!card || result !== null || !guess.trim() || checkingGuess) return
    const trimmed = guess.trim()

    let correct = trimmed.toLowerCase() === card.name.toLowerCase()
    if (!correct) {
      setCheckingGuess(true)
      try {
        const res = await fetch(
          `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(trimmed)}`
        )
        if (res.ok) {
          const data = await res.json()
          correct = data.name.toLowerCase() === card.name.toLowerCase()
        }
      } catch {
        // leave correct as false
      } finally {
        setCheckingGuess(false)
      }
    }
    setSubmittedGuess(trimmed)
    setResult(correct ? 'correct' : 'wrong')

    const checkers = {
      manaCost: checkManaCost,
      type: checkType,
      power: checkPower,
      toughness: checkToughness,
      set: checkSet,
      rules: checkRules,
    }
    const flushedClues = Object.fromEntries(
      Object.entries(clues).map(([key, clue]) => {
        if (clue.status === 'guessing' && clue.inputVal.trim()) {
          const g = clue.inputVal.trim()
          return [key, { ...clue, status: checkers[key](g) ? 'correct' : 'wrong', lastGuess: g, inputVal: '' }]
        }
        return [key, clue]
      })
    )

    const pts = correct
      ? calcRoundPoints(flushedClues, selectedSet)
      : calcCluePoints(flushedClues, selectedSet, cluePointsCorrectOnly)
    setRoundPoints(pts)
    setScore((s) => ({ points: s.points + pts, rounds: s.rounds + 1 }))

    if (correct) {
      setClues(revealAllClues(flushedClues))
    } else {
      setClues(flushedClues)
    }
  }

  const giveUp = () => {
    if (!card || result !== null) return
    const pts = calcCluePoints(clues, selectedSet, cluePointsCorrectOnly)
    setResult('skipped')
    setRoundPoints(pts)
    setScore((s) => ({ points: s.points + pts, rounds: s.rounds + 1 }))
    setClues(revealAllClues)
  }

  const retry = () => {
    const id = quizCardIds[quizCardIndex]
    if (id) fetchCardById(id)
    else fetchCard(undefined, seenCardIdsRef.current)
  }

  const next = () => {
    const maxPts = selectedSet ? 12 : 14
    const record = { cardName: card.name, cardId: card.id, result, roundPoints, maxPoints: maxPts }
    const newHistory = [...quizHistory, record]
    setQuizHistory(newHistory)

    if (newHistory.length >= quizConfig.cardCount) {
      setQuizPhase('summary')
      return
    }

    const nextIndex = quizCardIndex + 1
    setQuizCardIndex(nextIndex)
    setGuess('')
    setResult(null)
    setClues(initClues)

    const nextId = quizCardIds[nextIndex]
    if (nextId) {
      fetchCardById(nextId)
    } else {
      seenCardIdsRef.current.add(card.id)
      fetchCard(undefined, seenCardIdsRef.current)
    }
  }

  const artUrl =
    card?.image_uris?.art_crop ?? card?.card_faces?.[0]?.image_uris?.art_crop
  const manaCost =
    card?.mana_cost ?? card?.card_faces?.[0]?.mana_cost
  const power =
    card?.power ?? card?.card_faces?.[0]?.power
  const toughness =
    card?.toughness ?? card?.card_faces?.[0]?.toughness
  const oracleText =
    card?.oracle_text ?? card?.card_faces?.map((f) => f.oracle_text).join('\n—\n')

  // Per-clue guess checkers
  const checkManaCost = (g) => {
    if (!manaCost) return false
    // Parse into individual symbols, handling both {X} notation and bare input.
    // Regex matches: digit/letter hybrid (2/W), letter/letter hybrid (W/U), numbers, single letters.
    const parseSymbols = (s) => {
      const bare = s.replace(/\{([^}]+)\}/g, ' $1 ')
      const tokens = bare.match(/\d+\/[a-z]|[a-z]\/[a-z]|\d+|[a-z]/gi) ?? []
      return tokens
        .map((t) => t.toLowerCase().split('/').sort().join('/'))
        .sort()
        .join(',')
    }
    return parseSymbols(g) === parseSymbols(manaCost)
  }
  const checkType = (g) => norm(g) === norm(card?.type_line ?? '')
  const checkSet = (g) => {
    const lower = g.trim().toLowerCase()
    return lower === (card?.set_name ?? '').toLowerCase() ||
           lower === (card?.set ?? '').toLowerCase()
  }
  const checkPower     = (g) => g.trim() === (power     ?? '-')
  const checkToughness = (g) => g.trim() === (toughness ?? '-')
  const checkRules = (g) => matchRules(g, oracleText, card).correct

  const isLastCard = quizCardIndex + 1 >= quizConfig.cardCount

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">MTG Quiz</h1>
        {quizPhase === 'playing' && (
          <span className="quiz-progress">
            {quizCardIndex + 1} / {quizConfig.cardCount}
          </span>
        )}
        {quizPhase === 'playing' && score.rounds > 0 && (
          <div className="score">
            <span className="score-points">{score.points}</span>
            <span className="score-label"> pts</span>
          </div>
        )}
      </header>

      {quizPhase === 'setup' && (
        <QuizSetup onStart={handleStartQuiz} onBuild={() => setQuizPhase('builder')} />
      )}

      {quizPhase === 'builder' && (
        <QuizBuilder onStart={handleStartQuiz} onBack={() => setQuizPhase('setup')} />
      )}

      {quizPhase === 'playing' && (
        <main className="game">
          {loading && (
            <div className="state-message">
              <div className="spinner" />
              Loading card…
            </div>
          )}

          {error && !loading && (
            <div className="state-message error-state">
              <p>{error}</p>
              <div className="guess-actions">
                <button className="btn-primary" onClick={retry}>
                  Retry
                </button>
                <button className="btn-ghost" onClick={handleNewQuiz}>
                  New Quiz
                </button>
              </div>
            </div>
          )}

          {card && !loading && (
            <>
              <div className="card-art-wrapper">
                <img src={artUrl} alt="Card art" className="card-art" />
                <div className="artist-row">
                  <span className="artist">Art by {card.artist}</span>
                </div>
              </div>

              <div className="clues">
                <ClueButton
                  gameOver={result !== null}
                  label="Mana Cost"
                  state={clues.manaCost}
                  onUpdate={(u) => updateClue('manaCost', u)}
                  checkGuess={checkManaCost}
                  renderValue={() => <ManaSymbols cost={manaCost} />}
                  helpText="Write each symbol in sequence, e.g. 2UU or WWBB. For hybrid mana, include the slash: W/U for {W/U}."
                />
                <ClueButton
                  gameOver={result !== null}
                  label="Card Type"
                  state={clues.type}
                  onUpdate={(u) => updateClue('type', u)}
                  checkGuess={checkType}
                  renderValue={() => card.type_line}
                />
                <ClueButton
                  gameOver={result !== null}
                  label="Power"
                  state={clues.power}
                  onUpdate={(u) => updateClue('power', u)}
                  checkGuess={checkPower}
                  renderValue={() => power ?? '-'}
                />
                <ClueButton
                  gameOver={result !== null}
                  label="Toughness"
                  state={clues.toughness}
                  onUpdate={(u) => updateClue('toughness', u)}
                  checkGuess={checkToughness}
                  renderValue={() => toughness ?? '-'}
                />
                {!selectedSet && (
                  <ClueButton
                    gameOver={result !== null}
                    label="Set"
                    wide
                    state={clues.set}
                    onUpdate={(u) => updateClue('set', u)}
                    checkGuess={checkSet}
                    renderValue={() => card.set_name}
                  />
                )}
                <ClueButton
                  gameOver={result !== null}
                  label="Rules Text"
                  wide
                  state={clues.rules}
                  onUpdate={(u) => updateClue('rules', u)}
                  checkGuess={checkRules}
                  feedback={(g) => describeRulesMatch(matchRules(g, oracleText, card))}
                  helpText="Write the full rules text. Reminder text, punctuation and capitalization are ignored, and you can write the card's name as ~. Short texts must match exactly, longer ones 80% word for word, and every number and keyword must be right. Write none for cards without rules text."
                  renderValue={() => renderObfuscatedRules(oracleText, card)}
                />
              </div>

              {result === null ? (
                <form className="guess-form" onSubmit={submitGuess}>
                  <input
                    ref={inputRef}
                    className="guess-input"
                    type="text"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="Guess the card name…"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <div className="guess-actions">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={!guess.trim() || checkingGuess}
                    >
                      {checkingGuess ? 'Checking…' : 'Guess'}
                    </button>
                    <button type="button" className="btn-ghost" onClick={giveUp}>
                      Give Up
                    </button>
                  </div>
                </form>
              ) : (
                <div className={`result result--${result}`}>
                  <div className="result-header">
                    <p className="result-text">
                      {result === 'correct'
                        ? '✓ Correct!'
                        : result === 'wrong'
                          ? `✗ "${submittedGuess}" — it was "${card.name}"`
                          : `Card was "${card.name}"`}
                    </p>
                    {roundPoints > 0 && (
                      <span className="result-points">+{roundPoints} pts</span>
                    )}
                  </div>
                  <button className="btn-primary" onClick={next}>
                    {isLastCard ? 'Finish Quiz' : 'Next Card'}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      )}

      {quizPhase === 'summary' && (
        <QuizSummary
          history={quizHistory}
          onPlayAgain={handlePlayAgain}
          onNewQuiz={handleNewQuiz}
        />
      )}

      <footer className="footer">
        Card data provided by the{' '}
        <a href="https://scryfall.com/docs/api" target="_blank" rel="noreferrer">
          Scryfall API
        </a>
      </footer>
    </div>
  )
}
