# TODO_01: Codebase Refactoring - KISS & Architecture Improvements

## Repository Context

**Project**: Lorcana Collection Manager  
**Type**: React/TypeScript web application for managing Disney Lorcana TCG collections  
**Current State**: Functional but over-engineered with complex abstractions  
**Architecture**: React with TypeScript, Context API for state, utility-based filtering system

### Core Features
- Browse and search card database
- Manage personal collection with variant tracking (regular, foil, enchanted, special)
- Deck building functionality
- Advanced filtering and sorting
- Import/export collection data

### Current Architecture Issues
The codebase violates KISS principles through over-abstraction, has monolithic components, duplicates single-source-of-truth data, and implements unnecessary complex patterns where simpler solutions would be more maintainable.

---

## Issue 1: Over-Engineered Card Browser Hook

### Description
The `useCardBrowser` hook has become a "god hook" that handles too many responsibilities, making it difficult to maintain and test.

### Current State
**File**: `src/hooks/useCardBrowser.ts`
**Lines**: 1-171 (171 lines)
**Problems**:
- Returns 24 different properties and functions
- Handles state management, filtering, pagination, collection operations, and stale card logic
- Complex stale card prediction system (lines 80-123)
- Mixes UI state with business logic

### Proposed Solution
Split the monolithic hook into focused, single-responsibility hooks:
- `useCardFiltering` - Handle search term, filters, and filtered results
- `useCardSorting` - Handle sort options and sorted results  
- `useCardPagination` - Handle pagination logic
- `useStaleCardTracking` - Handle cards that no longer match filters
- `useCardBrowserUI` - Handle UI-specific state (view mode, show filters)

### Implementation Plan

#### Phase 1: Extract Card Filtering Logic
1. Create `src/hooks/useCardFiltering.ts`
   - Move search term state and filtering logic
   - Move filter state management
   - Return `{ searchTerm, setSearchTerm, filters, setFilters, filteredCards, activeFiltersCount }`

#### Phase 2: Extract Pagination Logic  
1. Create `src/hooks/useCardPagination.ts`
   - Move pagination state and logic
   - Simplify current pagination hook if over-engineered
   - Return `{ paginatedCards, pagination }`

#### Phase 3: Extract Sorting Logic
1. Create `src/hooks/useCardSorting.ts` 
   - Move sort state and sorting logic
   - Return `{ sortBy, setSortBy, sortedCards, groupBy, setGroupBy, groupedCards }`

#### Phase 4: Simplify Stale Card Tracking
1. Create `src/hooks/useStaleCardTracking.ts`
   - Replace complex prediction logic with simple re-filtering
   - Remove prediction system in favor of reactive updates
   - Return `{ refreshStaleCards }`

#### Phase 5: Update CardBrowser Component
1. Replace `useCardBrowser()` with individual hooks
2. Test functionality remains identical
3. Remove original `useCardBrowser.ts`

**Estimated Effort**: 4-6 hours  
**Risk Level**: Medium (breaking changes to main component)

---

## Issue 2: Monolithic CardBrowser Component

### Description
The CardBrowser component has grown to 305 lines and handles multiple responsibilities, violating the single responsibility principle.

### Current State
**File**: `src/components/CardBrowser.tsx`
**Lines**: 11-305 (294 lines)
**Problems**:
- Handles search UI, filter controls, sorting UI, pagination UI, and card display
- Complex conditional rendering logic
- Difficult to test individual pieces
- Hard to reuse parts in other contexts

### Proposed Solution
Break the component into focused sub-components:
- `CardSearchHeader` - Search input and controls
- `CardFilterControls` - Filter toggle and active filter display  
- `CardSortingControls` - Sort and group dropdowns
- `CardViewControls` - View mode toggle and pagination
- `CardResults` - Display filtered/sorted cards
- `CardBrowser` - Orchestrates the sub-components

### Implementation Plan

#### Phase 1: Extract Search Header
1. Create `src/components/card-browser/CardSearchHeader.tsx`
   - Move search input (lines 52-61)
   - Accept `{ searchTerm, onSearchChange }` props
   - Include proper TypeScript types

#### Phase 2: Extract Filter Controls  
1. Create `src/components/card-browser/CardFilterControls.tsx`
   - Move filter button and active filters display (lines 117-129)
   - Move refresh button (lines 105-116)
   - Accept filter state and handlers as props

#### Phase 3: Extract Sorting Controls
1. Create `src/components/card-browser/CardSortingControls.tsx`
   - Move sort dropdown (lines 63-91)
   - Move group dropdown (lines 92-104)
   - Accept sorting state and handlers as props

#### Phase 4: Extract View Controls
1. Create `src/components/card-browser/CardViewControls.tsx`
   - Move view mode toggle (lines 130-136)
   - Move pagination controls (lines 169-189, 221-270)
   - Accept view and pagination state as props

#### Phase 5: Extract Results Display
1. Create `src/components/card-browser/CardResults.tsx`
   - Move card rendering logic (lines 192-219)
   - Accept cards and rendering props

#### Phase 6: Update Main Component
1. Refactor `CardBrowser.tsx` to use sub-components
2. Should be ~50 lines orchestrating sub-components
3. Test all functionality works identically

**Estimated Effort**: 6-8 hours  
**Risk Level**: Medium (UI component breakup)

---

## Issue 3: Complex Filter System Architecture

### Description  
The filtering system is spread across multiple files with redundant logic and overly complex abstractions.

### Current State
**Files**: 
- `src/utils/cardFiltering.ts` (245 lines)
- `src/utils/cardConsolidation.ts` (138 lines)  
- `src/components/shared/FilterPanel.tsx` (205 lines)
- `src/components/QuickFilters.tsx` (221 lines)

**Problems**:
- `filterCards` function has 15+ different filter types in single function (lines 6-107)
- Duplicate filter logic between QuickFilters and FilterPanel
- Complex consolidation logic for simple variant grouping
- Filter state has 25 properties in single interface

### Proposed Solution
Simplify and consolidate the filtering architecture:
- Single `useCardFilters` hook managing all filter state
- Categorized filter functions (basic, range, collection)
- Unified filter components sharing logic
- Simplified filter state structure

### Implementation Plan

#### Phase 1: Restructure Filter Types
1. Update `src/types/index.ts`
   - Split `FilterOptions` into logical groups:
     ```typescript
     interface BasicFilters {
       search: string;
       sets: string[];
       colors: string[];
       rarities: string[];
       types: string[];
     }
     
     interface RangeFilters {
       costMin: number;
       costMax: number;
       strengthMin: number;
       strengthMax: number;
       // etc.
     }
     
     interface CollectionFilters {
       inMyCollection: boolean | null;
       cardCountOperator: 'eq' | 'gte' | 'lte' | null;
       cardCountValue: number;
     }
     ```

#### Phase 2: Simplify Filter Functions ✅ **COMPLETED**
1. ✅ Updated `src/utils/cardFiltering.ts`
   - ✅ Extracted categorized filter functions:
     ```typescript
     const matchesSearchFilter = (card, searchTerm) => { ... };
     const matchesColorFilter = (card, filters) => { ... };
     const matchesCollectionFilter = (card, filters, getVariantQuantities) => { ... };
     const matchesRangeFilters = (card, filters) => { ... };
     ```
   - ✅ Refactored main filter function to use extracted functions
   - ✅ Reduced main function from 135 lines to 49 lines
   - ✅ Improved readability and maintainability
   - ✅ Preserved 100% functional equivalence

#### Phase 3: Create Unified Filter Hook
1. Create `src/hooks/useCardFilters.ts`
   - Manage all filter state in single hook
   - Provide filtered cards result
   - Export common filter operations
   - Replace filter logic in both QuickFilters and FilterPanel

#### Phase 4: Unify Filter Components
1. Extract common filter operations from QuickFilters and FilterPanel
2. Create shared filter utilities
3. Update both components to use shared logic
4. Remove duplicated filter implementations

**Estimated Effort**: 8-10 hours  
**Risk Level**: High (core filtering logic changes)

---

## Issue 4: Single-Source-of-Truth Violations

### Description
Constants, icons, and configuration data are duplicated across multiple files, creating maintenance issues.

### Current State
**Problems**:
- `COLOR_ICONS` and `RARITY_ICONS` imported separately in 3+ components
- Ink colors hardcoded in QuickFilters but imported from data elsewhere  
- Filter default values scattered across files
- Game constants duplicated in multiple places

### Proposed Solution
Create centralized data management with single sources of truth:
- Single constants file for all game data
- Context provider for icons and shared data
- Centralized default configurations
- Remove all duplication

### Implementation Plan

#### Phase 1: Centralize Game Constants
1. Create `src/data/gameConstants.ts`
   - Move all hardcoded arrays (ink colors, rarities, types, etc.)
   - Export as single `GAME_CONSTANTS` object
   - Include icons mappings

#### Phase 2: Create Data Context
1. Create `src/contexts/GameDataContext.tsx`
   - Provide game constants and icons
   - Replace individual imports across components
   - Add `useGameData()` hook

#### Phase 3: Centralize Defaults
1. Create `src/config/defaults.ts`
   - Move all default filter values
   - Move default UI settings
   - Single source for configuration

#### Phase 4: Update All Imports
1. Replace individual constant imports across all components
2. Use context instead of direct imports
3. Remove duplicate constant definitions
4. Update QuickFilters to use centralized data

**Estimated Effort**: 3-4 hours  
**Risk Level**: Low (data reorganization)

---

## Issue 5: Unnecessary Card Consolidation Complexity

### Description
The card consolidation system is overly complex for what appears to be simple variant grouping functionality.

### Current State
**File**: `src/utils/cardConsolidation.ts`
**Lines**: 3-138 (135 lines)
**Problems**:
- Complex `ConsolidatedCard` type with 9 properties
- Multiple finder functions for variants
- Overly abstracted for simple variant grouping
- Complex matching logic for consolidated cards

### Proposed Solution
Simplify card data structure to flat variant-based approach:
- Replace `ConsolidatedCard` with simple `CardWithVariants`
- Inline variant logic where needed
- Remove unnecessary abstraction layers
- Simplify filtering and display logic

### Implementation Plan

#### Phase 1: Analyze Usage Patterns
1. Review all uses of `ConsolidatedCard` type
2. Identify which properties are actually needed
3. Document current functionality requirements

#### Phase 2: Design Simplified Structure  
1. Create new simplified card types:
   ```typescript
   interface CardWithVariants extends LorcanaCard {
     variants: {
       regular?: LorcanaCard;
       foil?: LorcanaCard;  
       enchanted?: LorcanaCard;
       special?: LorcanaCard[];
     }
   }
   ```

#### Phase 3: Update Card Processing
1. Replace consolidation logic with simpler variant grouping
2. Update filtering logic to work with new structure
3. Simplify display components to use flatter data

#### Phase 4: Update All References
1. Replace all `ConsolidatedCard` usage with new types
2. Update components, hooks, and utilities
3. Test functionality remains identical
4. Remove old consolidation system

**Estimated Effort**: 6-8 hours  
**Risk Level**: High (core data structure change)

---

## Issue 6: Over-Complex Stale Card Management

### Description
The stale card tracking system uses complex prediction logic when simple re-filtering would be more reliable and maintainable.

### Current State
**File**: `src/hooks/useCardBrowser.ts`  
**Lines**: 80-123 (43 lines of complex prediction logic)
**Problems**:
- Predicts future filter states instead of reacting to changes
- Complex state tracking for stale cards
- Multiple state variables for one concern
- Debug logging in production code

### Proposed Solution
Replace prediction system with reactive re-filtering:
- Remove stale card prediction logic
- Use simple effect to re-filter when collection changes
- Maintain better user experience with loading states
- Eliminate complex state management

### Implementation Plan

#### Phase 1: Remove Prediction Logic
1. Delete stale card prediction code (lines 80-123)
2. Remove stale card state variables
3. Remove notification system complexity

#### Phase 2: Implement Reactive Filtering
1. Add effect that re-filters when collection changes:
   ```typescript
   useEffect(() => {
     // Re-filter cards when collection changes
     // Show loading indicator during re-filtering
   }, [collection]);
   ```

#### Phase 3: Improve User Experience  
1. Add loading states during re-filtering
2. Add smooth transitions for filter changes
3. Maintain filter state across collection updates

#### Phase 4: Clean Up Components
1. Remove stale card UI elements from CardBrowser
2. Remove notification bubble code
3. Simplify component logic

**Estimated Effort**: 2-3 hours  
**Risk Level**: Low (removing complexity)

---

## Implementation Priority & Timeline

### High Priority (Complete First)
1. **Issue 6: Stale Card Management** (2-3 hours, Low Risk)
   - Quick win, removes complexity immediately
   - Improves code maintainability

2. **Issue 4: Single-Source-of-Truth** (3-4 hours, Low Risk)  
   - Foundation for other improvements
   - Reduces maintenance burden

### Medium Priority (Complete Second)
3. **Issue 1: Card Browser Hook** (4-6 hours, Medium Risk)
   - Enables easier testing and maintenance
   - Sets up for component refactoring

4. **Issue 2: Monolithic Component** (6-8 hours, Medium Risk)
   - Improves component reusability
   - Makes testing easier

### Low Priority (Complete Last)  
5. **Issue 3: Filter System** (8-10 hours, High Risk)
   - Most complex change
   - Requires other issues completed first

6. **Issue 5: Card Consolidation** (6-8 hours, High Risk)
   - Core data structure change
   - Should be done after filter system is stable

### Total Estimated Effort: 29-39 hours

### Risk Mitigation
- Create feature branches for each major change
- Maintain comprehensive test coverage during refactoring
- Deploy changes incrementally to staging environment
- Keep rollback plan for each major change

---

## Success Metrics

### Code Quality Improvements
- Reduce average component size by 50%
- Eliminate code duplication (DRY violations)
- Achieve single responsibility for all major components
- Remove complex abstractions where simpler solutions exist

### Maintainability Improvements  
- New developers can understand component purpose in <2 minutes
- Adding new filters requires changes in only 1-2 files
- Bug fixes can be isolated to single components
- Feature additions don't require changes across multiple files

### Performance Improvements
- Faster re-renders due to smaller, focused components
- Reduced memory usage from eliminated unnecessary abstractions
- Improved bundle size from removed duplicate code