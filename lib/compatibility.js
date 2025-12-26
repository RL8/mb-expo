/**
 * Compatibility scoring between two Swiftie profiles
 *
 * Scoring breakdown (with weights):
 * - Album matches: Uses user's weight allocation (max 65 points)
 *   - Position match bonus: If same album is in same rank position
 *   - Any overlap bonus: If album appears anywhere in both lists
 * - Song overlaps: Uses song weights if available (max 27 points)
 * - Lyric overlaps: Bonus for same taste (max 8 points)
 * Total possible: 100 points
 *
 * Legacy support: Falls back to position-based scoring if no weights
 */

/**
 * Calculate compatibility score between two profiles
 * @param {object} myProfile - The viewer's profile
 * @param {object} theirProfile - The shared profile being viewed
 * @returns {object|null} - Score details or null if can't compare
 */
export function calculateCompatibility(myProfile, theirProfile) {
  if (!myProfile?.topAlbums?.length || !theirProfile?.topAlbums?.length) {
    return null;
  }

  const myAlbums = myProfile.topAlbums || [];
  const theirAlbums = theirProfile.topAlbums || [];
  const myWeights = myProfile.albumWeights || {};
  const theirWeights = theirProfile.albumWeights || {};
  const hasWeights = Object.keys(myWeights).length > 0 && Object.keys(theirWeights).length > 0;

  // Track what matched for breakdown display
  const matches = {
    sameFirstAlbum: false,
    sameSecondAlbum: false,
    sameThirdAlbum: false,
    songOverlaps: 0,
    lyricOverlaps: 0,
    weightedAlbumScore: 0,
  };

  let score = 0;

  if (hasWeights) {
    // Weighted scoring: Compare album weights
    // Max 65 points for albums
    let albumScore = 0;

    // Position matches with weight boost
    if (myAlbums[0] && myAlbums[0] === theirAlbums[0]) {
      // Same #1: average of both weights, scaled to max 30
      const avgWeight = (myWeights[myAlbums[0]] + theirWeights[theirAlbums[0]]) / 2;
      albumScore += (avgWeight / 100) * 30;
      matches.sameFirstAlbum = true;
    }
    if (myAlbums[1] && myAlbums[1] === theirAlbums[1]) {
      const avgWeight = (myWeights[myAlbums[1]] + theirWeights[theirAlbums[1]]) / 2;
      albumScore += (avgWeight / 100) * 20;
      matches.sameSecondAlbum = true;
    }
    if (myAlbums[2] && myAlbums[2] === theirAlbums[2]) {
      const avgWeight = (myWeights[myAlbums[2]] + theirWeights[theirAlbums[2]]) / 2;
      albumScore += (avgWeight / 100) * 15;
      matches.sameThirdAlbum = true;
    }

    // Cross-position overlaps (album in both lists but different positions)
    myAlbums.forEach((albumId, myIdx) => {
      const theirIdx = theirAlbums.indexOf(albumId);
      if (theirIdx >= 0 && theirIdx !== myIdx) {
        // Partial credit for same album in different position
        const myWeight = myWeights[albumId] || 0;
        const theirWeight = theirWeights[albumId] || 0;
        const avgWeight = (myWeight + theirWeight) / 2;
        albumScore += (avgWeight / 100) * 5; // Small bonus
      }
    });

    matches.weightedAlbumScore = Math.round(albumScore);
    score += albumScore;
  } else {
    // Legacy position-based scoring
    if (myAlbums[0] && myAlbums[0] === theirAlbums[0]) {
      score += 30;
      matches.sameFirstAlbum = true;
    }
    if (myAlbums[1] && myAlbums[1] === theirAlbums[1]) {
      score += 20;
      matches.sameSecondAlbum = true;
    }
    if (myAlbums[2] && myAlbums[2] === theirAlbums[2]) {
      score += 15;
      matches.sameThirdAlbum = true;
    }
  }

  // Song overlaps (any match counts, regardless of position)
  const mySongs = Object.values(myProfile.albumSongs || {}).flat();
  const theirSongs = Object.values(theirProfile.albumSongs || {}).flat();
  const songMatches = mySongs.filter(s => theirSongs.includes(s));
  matches.songOverlaps = songMatches.length;
  score += songMatches.length * 3; // max 27

  // Lyric song overlaps (picked lyrics from same songs)
  const myLyricSongs = Object.keys(myProfile.songLyrics || {});
  const theirLyricSongs = Object.keys(theirProfile.songLyrics || {});
  const lyricMatches = myLyricSongs.filter(s => theirLyricSongs.includes(s));
  matches.lyricOverlaps = lyricMatches.length;
  score += Math.round(lyricMatches.length * 2.67); // max ~8

  // Cap at 100
  const finalScore = Math.min(Math.round(score), 100);

  return {
    score: finalScore,
    matches,
    breakdown: generateBreakdown(matches, hasWeights),
  };
}

/**
 * Generate human-readable breakdown of what matched
 */
function generateBreakdown(matches, hasWeights = false) {
  const items = [];

  if (matches.sameFirstAlbum) {
    items.push({ text: 'Same #1 album', positive: true });
  } else {
    items.push({ text: 'Different #1 album', positive: false });
  }

  const albumMatches = [matches.sameFirstAlbum, matches.sameSecondAlbum, matches.sameThirdAlbum]
    .filter(Boolean).length;

  if (albumMatches >= 2) {
    items.push({ text: `${albumMatches} albums in common`, positive: true });
  }

  // Show weighted score insight if weights were used
  if (hasWeights && matches.weightedAlbumScore > 0) {
    items.push({
      text: 'Similar intensity for favorites',
      positive: true,
    });
  }

  if (matches.songOverlaps > 0) {
    items.push({
      text: `${matches.songOverlaps} song${matches.songOverlaps > 1 ? 's' : ''} in common`,
      positive: true,
    });
  } else {
    items.push({ text: 'No songs in common', positive: false });
  }

  if (matches.lyricOverlaps > 0) {
    items.push({
      text: `Same taste in lyrics`,
      positive: true,
    });
  }

  return items;
}

/**
 * Get a fun label based on compatibility score
 */
export function getCompatibilityLabel(score) {
  if (score >= 90) return { label: 'Soulmates', emoji: '💫' };
  if (score >= 75) return { label: 'Best Friends', emoji: '✨' };
  if (score >= 60) return { label: 'Good Match', emoji: '🎵' };
  if (score >= 40) return { label: 'Different Eras', emoji: '🎭' };
  if (score >= 20) return { label: 'Opposites', emoji: '🔄' };
  return { label: 'Totally Different', emoji: '🌍' };
}

/**
 * Create a comparison record for storage
 */
export function createComparisonRecord(theirShareId, theirProfile, score) {
  return {
    shareId: theirShareId,
    theirAlbums: theirProfile.topAlbums || [],
    albumNames: theirProfile.albumNames || {},
    albumColors: theirProfile.albumColors || {},
    score,
    comparedAt: new Date().toISOString(),
  };
}
