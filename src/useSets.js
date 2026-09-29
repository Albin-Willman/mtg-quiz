import { useState, useEffect } from 'react'

const EXCLUDED_TYPES = new Set([
  'token', 'memorabilia', 'minigame', 'vanguard',
  'scheme', 'plane', 'phenomenon', 'commander', 'promo', 'alchemy', 'eternal', 'anthology'
])

const EXCLUDED_NAME_WORDS = ['commander', 'promo', 'promos', 'alchemy', 'eternal', 'anthology']

const isExcluded = (s) =>
  EXCLUDED_TYPES.has(s.set_type) ||
  EXCLUDED_NAME_WORDS.some((w) => s.name.toLowerCase().includes(w))

export default function useSets() {
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('https://api.scryfall.com/sets')
      .then((r) => r.json())
      .then((data) => {
        const filtered = data.data
          .filter((s) => !isExcluded(s) && s.card_count > 0)
          .sort((a, b) => b.released_at.localeCompare(a.released_at))
        setSets(filtered)
      })
      .finally(() => setLoading(false))
  }, [])

  return { sets, loading }
}
