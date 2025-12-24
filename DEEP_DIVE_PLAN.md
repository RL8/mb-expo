# Song Deep Dive Implementation Plan

## Overview
Add "Deep Dive" button to SongDetailModal that opens a full-screen overlay showing comprehensive song information.

## Data Available (from processedSongs)
- Basic: name, trackNumber, totalMinutes, wordCount, uniqueWordCount
- Audio: avgEnergy, avgDanceability, avgValence, avgAcousticness, avgTempo
- Content: vaultTracks, coWritersList, themesList, totalCharacters, avgIntensity
- Need to add: narrativeVoice (from raw song data)

## Component Structure

### 1. Update SongDetailModal
- Add "Deep Dive" button below existing content
- Pass all required data to new component

### 2. Create SongDeepDive Component
```
components/SongDeepDive.js
```

### 3. Deep Dive Sections

**Header**
- Song name, album name, track number
- Vault badge if applicable

**Basics**
- Duration (MM:SS format)
- Word count, unique words, vocabulary %

**Audio Profile** (visual bars)
- Energy, Danceability, Happiness, Acoustic
- Tempo (BPM)

**Content Analysis**
- Themes (tags)
- Co-writers (list)
- Narrative voice
- Emotional intensity

**Rankings**
- Rank in album for current metric
- Rank overall
- Percentile

## Implementation Steps
1. Add narrativeVoice to processedSongs in supabase.js
2. Create SongDeepDive component with all sections
3. Add "Deep Dive" button to SongDetailModal
4. Wire up data flow and styling
