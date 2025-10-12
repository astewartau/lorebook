# TODO: Simplify Card Grid

## Problem
The current card grid implementation is overly complex with too many hardcoded numbers and calculations that don't match the actual rendered card sizes. This is causing uneven horizontal vs vertical spacing.

## Solution: Minimal Card Grid Configuration

### Core Configuration (Only 3 Numbers)
```javascript
const CARD_ASPECT_RATIO = 2.5 / 3.5;
const GAP = 12; // Consistent spacing between cards
const MAX_CARD_WIDTH = 160; // Maximum card size
```

### Implementation Logic
1. **Calculate columns**: `Math.floor((containerWidth + GAP) / (MAX_CARD_WIDTH + GAP))`
2. **Actual card width**: `(containerWidth - (gaps)) / columns` 
3. **Card height**: `cardWidth / CARD_ASPECT_RATIO + controlsHeight`
4. **Position any card**:
   - x: `col * (cardWidth + GAP)`
   - y: `row * (cardHeight + GAP)`

### Benefits
- Only 3 configuration numbers instead of many hardcoded values (172, 232, 344, etc.)
- Aspect ratio defines card shape
- Gap provides consistent spacing everywhere
- Max width prevents cards from getting too large
- Everything else calculated from these core values
- Easy to adjust: change gap to 8px and everything updates consistently

### Current Issues to Fix
- Remove CSS Grid complexity
- Remove hardcoded positioning calculations
- Use actual rendered dimensions instead of assumed sizes
- Make horizontal and vertical spacing truly equal