// Fuzzy matching for rules text guesses.
// A guess passes when it shares at least MATCH_THRESHOLD of the words (in order)
// with the oracle text, every number matches exactly, and every keyword is present.
// Texts shorter than SHORT_TEXT_WORDS must match exactly, since one wrong word
// there ("any target" vs "target creature") changes the meaning.

const MATCH_THRESHOLD = 0.8
const SHORT_TEXT_WORDS = 10
const CARD_NAME_TOKEN = 'cardname'
const NO_TEXT_GUESSES = new Set(['none', 'vanilla', '-', 'no text', 'no rules text'])

const NUMBER_WORDS = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15',
  sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20',
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Names the oracle text may use to refer to the card itself,
// e.g. "Jace, the Mind Sculptor" is often just "Jace".
const selfNames = (card) => {
  const full = card.card_faces ? card.card_faces.map((f) => f.name) : [card.name]
  const short = full.filter((n) => n.includes(',')).map((n) => n.split(',')[0])
  return [...full, ...short].sort((a, b) => b.length - a.length)
}

export const tokenize = (text, names = []) => {
  let s = text.toLowerCase()
  s = s.replace(/\([^)]*\)/g, ' ') // reminder text
  s = s.replace(/\{card name\}|~/g, ` ${CARD_NAME_TOKEN} `)
  for (const n of names) {
    s = s.replace(new RegExp(escapeRegex(n.toLowerCase()), 'g'), ` ${CARD_NAME_TOKEN} `)
  }
  s = s.replace(/\{([^}]+)\}/g, ' $1 ') // {T} → t, {2} → 2
  s = s.replace(/['’]/g, '') // can't → cant
  s = s.replace(/[−–—-](?=\d)/g, '-') // keep minus signs: −1 loyalty, -1/-1
  s = s.replace(/-(?!\d)/g, ' ')
  s = s.replace(/[^a-z0-9+/\s-]/g, ' ')
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => NUMBER_WORDS[w] ?? w)
}

const isNumber = (w) => /\d/.test(w)

// Length of the longest common subsequence of two word arrays.
const lcsLength = (a, b) => {
  let prev = new Array(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0)
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1])
    }
    prev = cur
  }
  return prev[b.length]
}

const sortedNumbers = (words) => words.filter(isNumber).sort().join(',')

const containsSequence = (words, seq) =>
  words.some((_, i) => seq.every((w, j) => words[i + j] === w))

// Returns { correct, similarity, numbersOk, keywordsOk }.
export function matchRules(guess, oracleText, card) {
  if (!oracleText) {
    const correct = NO_TEXT_GUESSES.has(guess.trim().toLowerCase())
    return { correct, similarity: correct ? 1 : 0, numbersOk: true, keywordsOk: true }
  }

  // References to the card itself are free: omitting "~" is not a mistake.
  const names = selfNames(card)
  const answer = tokenize(oracleText, names).filter((w) => w !== CARD_NAME_TOKEN)
  const guessed = tokenize(guess, names).filter((w) => w !== CARD_NAME_TOKEN)
  if (answer.length === 0) {
    return { correct: false, similarity: 0, numbersOk: true, keywordsOk: true }
  }

  const similarity = lcsLength(answer, guessed) / Math.max(answer.length, guessed.length)
  const numbersOk = sortedNumbers(answer) === sortedNumbers(guessed)

  // Only keywords that appear outside reminder text are required.
  const keywordsOk = (card.keywords ?? [])
    .map((k) => tokenize(k))
    .filter((seq) => seq.length > 0 && containsSequence(answer, seq))
    .every((seq) => containsSequence(guessed, seq))

  const threshold = answer.length < SHORT_TEXT_WORDS ? 1 : MATCH_THRESHOLD
  return {
    correct: similarity >= threshold && numbersOk && keywordsOk,
    similarity,
    numbersOk,
    keywordsOk,
  }
}

export function describeRulesMatch({ similarity, numbersOk, keywordsOk }) {
  const parts = [`${Math.round(similarity * 100)}% match`]
  if (!numbersOk) parts.push('a number is wrong')
  if (!keywordsOk) parts.push('a keyword is missing')
  return parts.join(' · ')
}
