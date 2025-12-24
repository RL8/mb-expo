# Expo Router Migration Plan

**Status: COMPLETE**

## Goal
Replace React state navigation with file-based URL routing for persistent navigation, deep linking, and browser back support.

## New Structure
```
app/
├── _layout.js              # Root: fonts, auth, subscription providers
├── index.js                # / → Treemap (albums)
├── album/
│   └── [slug].js           # /album/fearless-tv → Album songs
├── song/
│   └── [id].js             # /song/123 → Song detail modal
├── profile/
│   ├── _layout.js          # Profile flow layout
│   ├── index.js            # /profile → Step 1 (albums)
│   └── preview.js          # /profile/preview → Final preview
├── p/
│   └── [shareId].js        # /p/abc123 → Shared profile
├── premium/
│   └── index.js            # /premium → Premium page + checkout
├── leaderboard.js          # /leaderboard → Comparison view
└── +not-found.js           # 404
```

## Migration Steps

### Phase 1: Setup
- [x] Install expo-router and dependencies
- [x] Update package.json main entry
- [x] Create app/_layout.js with providers
- [x] Create app/index.js (minimal, renders existing App content)

### Phase 2: Extract Components
- [x] Extract AnimatedTile → components/AnimatedTile.js
- [x] Create dataStore for shared album/song data
- [x] Ensure components accept callbacks instead of managing navigation

### Phase 3: Create Routes
- [x] app/index.js → Treemap with router.push
- [x] app/album/[slug].js → Album drill-down
- [x] app/song/[id].js → Song modal (with album context)
- [x] app/profile/index.js → Profile builder
- [x] app/profile/preview.js → Profile preview
- [x] app/p/[shareId].js → Shared profile
- [x] app/premium/index.js → Premium page
- [x] app/leaderboard.js → Comparison leaderboard
- [x] app/+not-found.js → 404 page

### Phase 4: Cleanup
- [x] Remove old index.js entry point
- [x] Old App.js preserved for reference (no longer entry point)
- [x] Update all navigation to use router
- [ ] Test deep links and browser back (manual testing required)

## State Ownership
| State | Owner |
|-------|-------|
| Current route | Expo Router (URL) |
| Album/song selection | URL params |
| Auth (user, session) | Zustand (authStore) |
| Subscription | Zustand (subscriptionStore) |
| Profile data | Zustand or React Query |

## Key APIs
```jsx
import { useRouter, useLocalSearchParams, Link } from 'expo-router';

// Navigate
router.push('/album/fearless-tv');
router.push('/song/123');
router.back();

// Read params
const { slug } = useLocalSearchParams();

// Declarative link
<Link href="/premium">Upgrade</Link>
```
