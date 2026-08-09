# Outfitted interface style

Build a lively private wardrobe catalogue: confident, useful, tactile, and personal. It should feel closer to a well-kept fashion scrapbook than an enterprise dashboard, generic AI tool, or retail storefront.

## Visual language

- Use a warm cream canvas and deep ink text. Berry is the primary action colour, teal provides structure, and citrus is the high-energy highlight.
- Use Space Grotesk for expressive UI hierarchy and IBM Plex Mono for compact labels, inventory counts, and processing metadata.
- Garment images are the visual lead. Give cards clear framing, generous crops, and varied but disciplined colour moments.
- Make interactions tactile: crisp borders, slightly rounded corners, confident hover movement, and obvious focus states. Avoid glass effects, gradients, giant pills, and default SaaS-dashboard panels.
- Keep the product practical. Colour should distinguish actions and state, not obstruct scanning a wardrobe.

## Layout and components

- Use Tailwind utilities and reusable shadcn-style primitives; global CSS is reserved for tokens, base rules, and shared animation only.
- Prefer a catalogue grid on desktop and dense two-column cards on mobile. Item titles may wrap; never hide useful garment names behind arbitrary ellipsis.
- Use compact mono badges for analysis state. Use dialogs for destructive confirmation rather than browser-native confirmation.
- Give empty, loading, pending, and failed states their own considered visual treatment.

## QA

Before calling UI work complete, check that it is recognisably Outfitted, works comfortably one-handed on mobile, has readable contrast, preserves private-data boundaries, and does not introduce styling logic into application services.
