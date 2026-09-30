import { useState, useRef, useEffect } from 'react'
import useSets from './useSets'

export default function SetPicker({ value, onChange, disabled }) {
  const { sets, loading } = useSets()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const filtered = query.trim()
    ? sets.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.code.toLowerCase().includes(query.toLowerCase()),
      )
    : sets

  const handleSelect = (set) => {
    onChange(set)
    setQuery('')
    setOpen(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange(null)
    setQuery('')
    setOpen(false)
  }

  const handleInputChange = (e) => {
    setQuery(e.target.value)
    setOpen(true)
  }

  const handleFocus = () => setOpen(true)

  useEffect(() => {
    const onPointerDown = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const displayValue = open ? query : (value?.name ?? query)

  return (
    <div className="set-picker" ref={containerRef}>
      <div className="set-picker-input-row">
        {value && !open && (
          <img
            className="set-picker-icon"
            src={value.icon_svg_uri}
            alt=""
          />
        )}
        <input
          ref={inputRef}
          className="set-picker-input"
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={loading ? 'Loading sets…' : 'All sets'}
          disabled={loading || disabled}
          autoComplete="off"
          spellCheck={false}
        />
        {value && (
          <button className="set-picker-clear" onClick={handleClear} aria-label="Clear set">
            ×
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className="set-picker-dropdown">
          {filtered.slice(0, 80).map((s) => (
            <li key={s.code}>
              <button
                className={`set-picker-option${value?.code === s.code ? ' selected' : ''}`}
                onPointerDown={(e) => {
                  e.preventDefault()
                  handleSelect(s)
                }}
              >
                <img className="set-picker-icon" src={s.icon_svg_uri} alt="" />
                <span className="set-option-name">{s.name}</span>
                <span className="set-option-meta">
                  {s.code.toUpperCase()} · {s.card_count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
