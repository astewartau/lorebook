# Migration Plan: Full Foil & Promo Support

## Current State
- ✅ Database uses card_id system (not names)
- ❌ No foil tracking (single quantity field)
- ❌ Promo card matching broken in Dreamborn import
- ❌ Foil information lost during import

## Proposed Solution

### 1. Database Schema Changes

**Option A: Add foil columns (Recommended)**
```sql
ALTER TABLE user_collections 
ADD COLUMN quantity_normal INTEGER DEFAULT 0 CHECK (quantity_normal >= 0),
ADD COLUMN quantity_foil INTEGER DEFAULT 0 CHECK (quantity_foil >= 0);

-- Migrate existing quantity to quantity_normal
UPDATE user_collections SET quantity_normal = quantity;

-- Drop old quantity column after migration
ALTER TABLE user_collections DROP COLUMN quantity;
```

**Option B: Separate foil tracking table**
```sql
CREATE TABLE user_collections_foil (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id INTEGER NOT NULL,
  quantity_foil INTEGER DEFAULT 0 CHECK (quantity_foil >= 0),
  UNIQUE(user_id, card_id)
);
```

**Recommendation:** Option A is simpler and maintains a single source of truth per card.

### 2. Promo Card Matching Fix

The problem: Dreamborn uses set codes like P1, P2, C1, D23 but our cards use:
- Regular setCode (1, 2, 3, etc.) 
- With promoGrouping field (P1, P2, etc.)

**Solution:** Update the matching logic in `dreambornImport.ts`:

```typescript
// Map Dreamborn set codes to our system
const mapDreambornSetCode = (csvSet: string): { setCode: string, isPromo: boolean, promoGroup?: string } => {
  // Promo sets
  if (csvSet === 'P1') return { setCode: '1', isPromo: true, promoGroup: 'P1' };
  if (csvSet === 'P2') return { setCode: '2', isPromo: true, promoGroup: 'P1' }; 
  if (csvSet === 'C1') return { setCode: '1', isPromo: true, promoGroup: 'C1' };
  if (csvSet === 'D23') return { setCode: '1', isPromo: true, promoGroup: 'D23' };
  
  // Regular sets (map 001 -> 1, 002 -> 2, etc.)
  const setNumber = parseInt(csvSet);
  if (!isNaN(setNumber)) {
    return { setCode: setNumber.toString(), isPromo: false };
  }
  
  return { setCode: csvSet, isPromo: false };
};

// Updated matching logic
const matchCardToDatabase = (csvRow: DreambornCSVRow): ConsolidatedCard | null => {
  const { setCode, isPromo, promoGroup } = mapDreambornSetCode(csvSet);
  const cardNumber = parseInt(csvCardNumber);
  
  // Find matching card
  let matches = consolidatedCards.filter(consolidatedCard => {
    const { baseCard } = consolidatedCard;
    
    if (isPromo) {
      // For promos, match by promoGrouping, setCode, and number
      return baseCard.setCode === setCode && 
             baseCard.number === cardNumber && 
             baseCard.promoGrouping === promoGroup;
    } else {
      // For regular cards, match by setCode and number (no promoGrouping)
      return baseCard.setCode === setCode && 
             baseCard.number === cardNumber && 
             !baseCard.promoGrouping;
    }
  });
  
  // Rest of matching logic...
};
```

### 3. Update Collection Context

```typescript
interface CollectionCardEntry {
  cardId: number;
  quantityNormal: number;
  quantityFoil: number;
}

// Update methods to handle both quantities
const addCardToCollection = (cardId: number, quantityNormal: number = 0, quantityFoil: number = 0) => {
  // Implementation
};

const getCardQuantities = (cardId: number): { normal: number, foil: number, total: number } => {
  const card = collection.find(c => c.cardId === cardId);
  return {
    normal: card?.quantityNormal || 0,
    foil: card?.quantityFoil || 0,
    total: (card?.quantityNormal || 0) + (card?.quantityFoil || 0)
  };
};
```

### 4. Update Dreamborn Import

```typescript
// Import cards with foil distinction preserved
for (const importedCard of importedCards) {
  const { consolidatedCard, normalQuantity, foilQuantity } = importedCard;
  
  if (normalQuantity > 0 || foilQuantity > 0) {
    // Add both normal and foil quantities
    addCardToCollection(
      consolidatedCard.baseCard.id, 
      normalQuantity,
      foilQuantity
    );
  }
}
```

## Migration Steps

### Phase 1: Database Changes
1. Create migration SQL file
2. Test on development database
3. Run migration on production
4. Update Supabase types

### Phase 2: Code Updates
1. Fix promo matching in dreambornImport.ts
2. Update CollectionContext for dual quantities
3. Update UI components to show foil counts
4. Update import/export logic

### Phase 3: Data Migration
1. Existing data: Move quantity → quantity_normal
2. Set quantity_foil = 0 for all existing records
3. Allow users to re-import with foil data

## Benefits
- ✅ Full foil tracking restored
- ✅ Promo cards import correctly
- ✅ Backward compatible (existing data preserved)
- ✅ Clean separation of normal/foil quantities
- ✅ Maintains single card_id system

## Testing Plan
1. Test promo card matching with sample CSV
2. Verify foil quantities tracked separately
3. Ensure UI displays both quantities correctly
4. Test import/export round-trip
5. Verify database constraints work