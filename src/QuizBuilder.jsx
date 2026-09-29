import { useState, useEffect, Fragment } from 'react'

export default function QuizBuilder({ onStart, onBack }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const [selected, setSelected] = useState([]) // [{id, name, set_name, set, artUrl}]
  const [copied, setCopied] = useState(false)

  const [expandedName, setExpandedName] = useState(null)
  const [printsCache, setPrintsCache] = useState({}) // {name: [{id, set_name, set, released_at, artUrl}]}
  const [loadingName, setLoadingName] = useState(null) // card name currently being fetched

  useEffect(() => {
    const q = query.trim()
    if (!q) { setResults([]); setNoResults(false); return }
    setNoResults(false)
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`name:${q}`)}&unique=names&order=name`
        )
        if (res.status === 404 || res.status === 422) {
          setResults([]); setNoResults(true); return
        }
        const data = await res.json()
        setResults((data.data ?? []).slice(0, 20).map((c) => ({
          id: c.id,
          name: c.name,
          set_name: c.set_name,
          set: c.set,
          artUrl: c.image_uris?.art_crop ?? c.card_faces?.[0]?.image_uris?.art_crop,
        })))
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

  const selectedNames = new Set(selected.map((c) => c.name))
  const isSelectedByName = (name) => selectedNames.has(name)

  const addCard = (card) => {
    if (isSelectedByName(card.name)) return
    setSelected((prev) => [...prev, card])
    setExpandedName(null)
  }

  const removeCard = (id) => setSelected((prev) => prev.filter((c) => c.id !== id))

  const handleAddClick = async (card) => {
    if (isSelectedByName(card.name)) return

    // Collapse if already expanded
    if (expandedName === card.name) { setExpandedName(null); return }

    // Use cache if available
    const cached = printsCache[card.name]
    if (cached) {
      if (cached.length === 1) { addCard(cached[0]); return }
      setExpandedName(card.name)
      return
    }

    // Fetch prints
    setLoadingName(card.name)
    try {
      const res = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`!"${card.name}"`)}&unique=prints&order=released`
      )
      const data = await res.json()
      const prints = (data.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        set_name: c.set_name,
        set: c.set,
        released_at: c.released_at,
        artUrl: c.image_uris?.art_crop ?? c.card_faces?.[0]?.image_uris?.art_crop,
      }))
      const resolved = prints.length > 0 ? prints : [card]
      setPrintsCache((prev) => ({ ...prev, [card.name]: resolved }))

      if (resolved.length === 1) {
        addCard(resolved[0])
      } else {
        setExpandedName(card.name)
      }
    } catch {
      // On error, add the card as-is
      addCard(card)
    } finally {
      setLoadingName(null)
    }
  }

  const buildShareUrl = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('quiz', selected.map((c) => c.id).join(','))
    url.searchParams.set('quizCount', selected.length.toString())
    url.searchParams.delete('quizSet')
    url.searchParams.delete('card')
    return url.toString()
  }

  const handleShare = () => {
    navigator.clipboard.writeText(buildShareUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStart = () => {
    onStart({ set: null, cardCount: selected.length, cardIds: selected.map((c) => c.id) })
  }

  return (
    <div className="quiz-builder">
      <div className="builder-header">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <h2 className="builder-title">Build Quiz</h2>
        <div className="builder-header-actions">
          <button className="share-btn" onClick={handleShare} disabled={selected.length === 0}>
            {copied ? 'Copied!' : 'Share'}
          </button>
          <button className="btn-primary" onClick={handleStart} disabled={selected.length === 0}>
            Start{selected.length > 0 ? ` (${selected.length})` : ''}
          </button>
        </div>
      </div>

      <input
        className="builder-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search card name…"
        autoComplete="off"
        spellCheck={false}
        autoFocus
      />

      {(results.length > 0 || searching || noResults) && (
        <ul className="builder-results">
          {searching && results.length === 0 && (
            <li className="builder-status">Searching…</li>
          )}
          {noResults && <li className="builder-status">No cards found</li>}
          {results.map((card) => {
            const added = isSelectedByName(card.name)
            const expanded = expandedName === card.name
            const loading = loadingName === card.name
            const prints = printsCache[card.name]
            return (
              <Fragment key={card.id}>
                <li className={`builder-result${expanded ? ' builder-result--expanded' : ''}`}>
                  {card.artUrl && (
                    <img className="builder-result-art" src={card.artUrl} alt="" />
                  )}
                  <div className="builder-result-info">
                    <span className="builder-result-name">{card.name}</span>
                    <span className="builder-result-set">{card.set_name}</span>
                  </div>
                  <button
                    className={`builder-add-btn${added ? ' builder-add-btn--added' : ''}`}
                    onClick={() => handleAddClick(card)}
                    disabled={added || loading}
                    title={added ? 'Already added' : expanded ? 'Collapse' : 'Add to quiz'}
                  >
                    {added ? '✓' : loading ? <span className="builder-btn-spinner" /> : expanded ? '−' : '+'}
                  </button>
                </li>
                {expanded && (
                  <li className="builder-prints-panel">
                    {(prints ?? []).map((p) => (
                      <button key={p.id} className="builder-print-option" onClick={() => addCard(p)}>
                        {p.artUrl && <img className="builder-print-art" src={p.artUrl} alt="" />}
                        <span className="builder-print-set">{p.set_name}</span>
                        <span className="builder-print-year">{p.released_at?.slice(0, 4)}</span>
                      </button>
                    ))}
                  </li>
                )}
              </Fragment>
            )
          })}
        </ul>
      )}

      {selected.length > 0 && (
        <div className="builder-selected-section">
          <p className="builder-selected-label">Selected cards</p>
          <ul className="builder-selected">
            {selected.map((card) => (
              <li key={card.id} className="builder-selected-row">
                <span className="builder-selected-name">{card.name}</span>
                <span className="builder-selected-set">{card.set_name}</span>
                <button className="builder-remove-btn" onClick={() => removeCard(card.id)} title="Remove">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
