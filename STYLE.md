# Outfitted interface style

Outfitted is a lively private wardrobe catalogue: confident, useful, tactile, personal. Aim for a well-kept fashion scrapbook, not an enterprise dashboard, generic AI tool or retail storefront.

## Visual language

- Warm cream canvas, deep ink text. Berry is the primary action colour, teal gives structure, citrus is the high-energy highlight. Colour marks actions and state; garments stay easy to scan.
- Space Grotesk carries expressive hierarchy; IBM Plex Mono carries compact labels, inventory counts and processing metadata.
- Garment images lead. Give cards clear framing, generous crops, and varied but disciplined colour moments.
- Interactions feel tactile: crisp borders, slightly rounded corners, confident hover movement, obvious focus states. Surfaces are flat and solid (no glass, gradients, giant pills or stock SaaS panels).
- Every label adds context its heading lacks; a heading stands alone when there is nothing to add.

## Layout and components

- Build with Tailwind utilities and the shadcn-style primitives in `src/components/ui`. Global CSS holds only tokens, base rules and shared animation.
- Catalogue grid on desktop, dense two-column cards on mobile. Garment names wrap in full.
- Analysis state uses compact mono badges. Destructive actions confirm in a dialog.
- Empty, loading, pending and failed states each get their own considered design.

## QA

UI work is done when it is recognisably Outfitted, comfortable one-handed on mobile, readable in contrast, keeps each member's data private, and keeps styling logic in components rather than application services.
