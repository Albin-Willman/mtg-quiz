import { useState, useCallback } from 'react'

const SKIP_TYPES = ['Basic Land']
const RANDOM_BASE_QUERY = '-set_type:commander -set_type:promo -set_type:alchemy'

async function fetchAndValidate(url, signal, skipValidation, excludeIds, retries = 10) {
  if (retries <= 0) throw new Error('Could not find a valid card after several attempts')
  const res = await fetch(url, { signal })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.details ?? 'Failed to fetch card')
  }
  const data = await res.json()

  if (!skipValidation) {
    const artUrl =
      data.image_uris?.art_crop ?? data.card_faces?.[0]?.image_uris?.art_crop
    if (
      !artUrl ||
      SKIP_TYPES.some((t) => data.type_line?.includes(t)) ||
      excludeIds?.has(data.id)
    ) {
      return fetchAndValidate(url, signal, false, excludeIds, retries - 1)
    }
  }

  return data
}

export default function useCard(setCode, cardType, cardFormat) {
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCard = useCallback(
    async (signal, excludeIds) => {
      setLoading(true)
      setError(null)
      try {
        let q = setCode ? `set:${setCode}` : RANDOM_BASE_QUERY
        if (cardType) q += ` type:${cardType}`
        if (cardFormat) q += ` f:${cardFormat}`
        const url = `https://api.scryfall.com/cards/random?q=${encodeURIComponent(q)}`
        const data = await fetchAndValidate(url, signal, false, excludeIds)
        if (signal?.aborted) return
        setCard(data)
      } catch (e) {
        if (e.name === 'AbortError') return
        setError(e.message)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [setCode, cardType, cardFormat],
  )

  const fetchCardById = useCallback(async (id, signal) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAndValidate(
        `https://api.scryfall.com/cards/${id}`,
        signal,
        true,
      )
      if (signal?.aborted) return
      setCard(data)
    } catch (e) {
      if (e.name === 'AbortError') return
      setError(e.message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  return { card, loading, error, fetchCard, fetchCardById }
}
