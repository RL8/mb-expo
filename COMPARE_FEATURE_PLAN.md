# Compare Feature Implementation Plan

## Overview
Add a "Compare" feature that calculates compatibility scores between Swiftie profiles, saves comparisons to a personal leaderboard, and notifies users when someone compares with them.

---

## Checklist

### Phase 1: Core Infrastructure
- [ ] Create `lib/compatibility.js` - scoring algorithm
- [ ] Create Supabase `comparisons` table migration
- [ ] Update `lib/storage.js` - add local comparisons storage
- [ ] Update `lib/supabase.js` - add comparison CRUD functions

### Phase 2: Comparison UI
- [ ] Update `SharedProfileView.js` - show compatibility score + breakdown
- [ ] Auto-save comparison when viewing (if user has profile)
- [ ] Add "View Leaderboard" CTA
- [ ] Add "Create yours to compare" CTA (if no profile)

### Phase 3: Leaderboard
- [ ] Create `ComparisonLeaderboard.js` component
- [ ] Display ranked comparisons (local + remote)
- [ ] Tap to re-view shared profile
- [ ] Add entry point from ProfileCard/ProfileBuilder

### Phase 4: Notifications & Engagement
- [ ] Fetch incoming comparisons on app load
- [ ] Show notification badge when new comparisons exist
- [ ] "Share to get more comparisons" prompt
- [ ] Display "X people compared with you" on profile

### Phase 5: Polish
- [ ] Empty state for leaderboard
- [ ] Loading states
- [ ] Error handling
- [ ] Test end-to-end flow

---

## Data Models

### Supabase: `comparisons` table
```sql
id              UUID PRIMARY KEY
viewer_share_id VARCHAR(16)     -- who viewed (their share ID)
viewed_share_id VARCHAR(16)     -- whose profile was viewed
score           INTEGER         -- compatibility 0-100
viewer_albums   JSONB           -- denormalized for display
created_at      TIMESTAMPTZ
```

### Local Storage Addition
```javascript
{
  // existing profile fields...
  myShareId: "xK9mPq2w",  // cached after first share
  comparisons: [
    {
      shareId: "abc123",
      theirAlbums: [...],
      albumNames: {...},
      score: 87,
      comparedAt: "2024-12-24T..."
    }
  ],
  lastSeenComparisons: "2024-12-24T..."  // for notification badge
}
```

---

## Scoring Algorithm

| Match Type | Points |
|------------|--------|
| Same #1 album | 30 |
| Same #2 album | 20 |
| Same #3 album | 15 |
| Each song overlap (max 9) | 3 each (max 27) |
| Each lyric-song match (max 3) | ~3 each (max 8) |
| **Total** | **100** |

---

## User Flows

### Flow 1: Visitor without profile
```
View shared profile → See rankings → "Create yours to compare" → ProfileBuilder
```

### Flow 2: Visitor with profile (no share ID yet)
```
View shared profile → See score → Prompt to share theirs → Creates share ID → Comparison saved to Supabase
```

### Flow 3: Visitor with profile + share ID
```
View shared profile → See score → Comparison saved → "View Leaderboard"
```

### Flow 4: Profile owner checks notifications
```
Open profile → Fetch incoming comparisons → "3 new comparisons!" → View leaderboard
```

---

## UI Components

### Compatibility Card (in SharedProfileView)
```
┌────────────────────────────────┐
│       73% Compatible           │
│  ██████████████░░░░░░░░░░░░░░  │
│                                │
│  ✓ Same #1 album               │
│  ✓ 4 songs in common           │
│  ✗ Different #2 & #3           │
└────────────────────────────────┘
```

### Share Prompt (if no share ID)
```
┌────────────────────────────────┐
│  Share your profile to:        │
│  • See who compares with you   │
│  • Build your leaderboard      │
│                                │
│  [ Create Share Link ]         │
└────────────────────────────────┘
```

### Leaderboard Entry
```
┌────────────────────────────────┐
│ 🥇 87%  ████████████████░░     │
│    Folklore #1 · 2h ago        │
└────────────────────────────────┘
```

---

## Files to Create
- `lib/compatibility.js`
- `components/ComparisonLeaderboard.js`
- `components/CompatibilityCard.js`
- `supabase/migrations/20241224_comparisons.sql`

## Files to Modify
- `lib/storage.js`
- `lib/supabase.js`
- `components/SharedProfileView.js`
- `components/ProfileBuilder.js`
- `App.js`
