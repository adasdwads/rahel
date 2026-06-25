# Rahel App Icon Specification

## Concept
A premium, elegant app icon conveying trust, legacy, and luxury.

## Design

- **Symbol**: A single uppercase letter **R** in an elegant serif typeface (e.g., Playfair Display, Didot, or Bodoni).
- **Foreground color**: Rich gold `#C8A84E` (primary accent) with optional subtle gradient to classic gold `#D4AF37`.
- **Background**: Pure white `#FFFFFF`.
- **Style**: Minimal and clean. No extra shapes, shadows, or embellishments. The letterform alone carries the identity.
- **Padding**: The R should occupy roughly 60-65% of the icon area, centered both horizontally and vertically.

## Variants

| Context              | Size      | Notes                                  |
|----------------------|-----------|----------------------------------------|
| iOS App Icon         | 1024x1024 | No transparency, no rounded corners    |
| Android Adaptive     | 432x432   | Foreground layer only; safe zone aware |
| Notification (small) | 96x96     | Monochrome white R on transparent bg   |
| Splash screen        | 288x288   | Gold R on white, centered              |

## Colors

| Token             | Hex       | Usage             |
|-------------------|-----------|-------------------|
| Primary Gold      | `#C8A84E` | Letter fill       |
| Classic Gold      | `#D4AF37` | Gradient end      |
| Background White  | `#FFFFFF` | Icon background   |

## Typography Guidelines

- Use a high-contrast serif font with thin hairlines and thick stems.
- Optionally add a very subtle gold drop-shadow (1px, 10% opacity) for depth on larger sizes.
- The letter should feel hand-crafted and timeless, not tech or startup.

## Do / Don't

- **Do**: Keep it simple, one letter, two colors.
- **Do**: Ensure legibility at 29x29 (smallest iOS size).
- **Don't**: Add gradients that reduce contrast at small sizes.
- **Don't**: Use rounded or sans-serif fonts.
- **Don't**: Add borders, rings, or background shapes.
