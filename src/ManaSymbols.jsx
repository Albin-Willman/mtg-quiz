export default function ManaSymbols({ cost }) {
  if (!cost) return <span className="no-mana">No mana cost</span>
  const symbols = cost.match(/\{[^}]+\}/g) ?? []
  return (
    <span className="mana-symbols">
      {symbols.map((sym, i) => {
        const code = sym.slice(1, -1).replace(/\//g, '')
        return (
          <img
            key={i}
            src={`https://svgs.scryfall.io/card-symbols/${code}.svg`}
            alt={sym}
            className="mana-symbol"
          />
        )
      })}
    </span>
  )
}
