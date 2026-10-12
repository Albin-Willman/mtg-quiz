# MTG Quiz

A Magic: The Gathering card-guessing game built with React. You're shown a card's art crop and must guess the card name — optionally uncovering clues like mana cost, card type, power/toughness, set, and rules text along the way.

**Live:** https://albin-willman.github.io/mtg-quiz/

---

## How it works

Each round you see a card's art. You can guess the name immediately or reveal clues one at a time — each revealed clue costs you points. Guessing correctly on a clue earns 2 pts for that clue; giving up earns 0. The name guess itself is worth 2 pts if correct.

Clue guesses are flexible:
- **Mana cost** — order-independent; `2UU` and `UU2` are the same. Hybrid mana uses slash notation: `{W/U}`.
- **Card type** — em dashes (`—`) are accepted as regular hyphens.
- **Card name** — fuzzy matching via the Scryfall API catches typos and alternate spellings.

---

## Features

- **Random quiz** — draw cards from all of Magic or filter by set, card type, or format
- **Quiz builder** — search by card name, pick specific printings, build a hand-curated quiz
- **Shareable links** — every quiz generates a `?quiz=id1,id2,...` URL you can send to friends; they play the exact same cards in the same order
- **No duplicates** — random quizzes never show the same card twice
- **Dark mode** — follows system preference

---

## Setup

```bash
git clone https://github.com/Albin-Willman/mtg-quiz
cd mtg-quiz
npm install
npm run dev
```

### Deploy to GitHub Pages

```bash
npm run deploy
```

---

## Tech

- [React 19](https://react.dev/) + [Vite 5](https://vitejs.dev/)
- [Scryfall API](https://scryfall.com/docs/api) — card data, images, search
