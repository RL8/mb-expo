/**
 * Weighting utilities for preference intensity allocation
 *
 * Three preset curves:
 * - balanced: Even distribution respecting rank order
 * - oneFavorite: Top-heavy, #1 dominates
 * - topHeavy: Top 3 get most points
 */

/**
 * Calculate linear allocation based on rank position
 * Formula: points = (total + 1 - rank) * (100 / triangularSum)
 * @param {number} rank - 1-based rank position
 * @param {number} total - Total number of items
 * @returns {number} - Points allocated (rounded)
 */
export function linearAllocation(rank, total) {
  const triangularSum = (total * (total + 1)) / 2;
  return Math.round((total + 1 - rank) * (100 / triangularSum));
}

/**
 * Generate allocation for all ranks using a preset curve
 * @param {number} count - Number of items to allocate
 * @param {'balanced' | 'oneFavorite' | 'topHeavy'} preset - Curve type
 * @returns {number[]} - Array of point allocations (index 0 = rank 1)
 */
export function generateAllocation(count, preset = 'balanced') {
  const allocations = [];

  switch (preset) {
    case 'oneFavorite': {
      // #1 gets ~50%, rest split evenly
      const topShare = 50;
      const remaining = 50;
      const perItem = Math.floor(remaining / (count - 1));
      allocations.push(topShare);
      for (let i = 1; i < count; i++) {
        allocations.push(perItem);
      }
      // Adjust last item to ensure sum = 100
      const sum = allocations.reduce((a, b) => a + b, 0);
      allocations[allocations.length - 1] += (100 - sum);
      break;
    }

    case 'topHeavy': {
      // Top 3 get ~70%, rest split remaining
      const topCount = Math.min(3, count);
      const topShare = Math.floor(70 / topCount);
      const remaining = 100 - (topShare * topCount);
      const restCount = count - topCount;
      const perRest = restCount > 0 ? Math.floor(remaining / restCount) : 0;

      for (let i = 0; i < topCount; i++) {
        allocations.push(topShare);
      }
      for (let i = 0; i < restCount; i++) {
        allocations.push(perRest);
      }
      // Adjust to sum to 100
      const sum = allocations.reduce((a, b) => a + b, 0);
      if (allocations.length > 0) {
        allocations[allocations.length - 1] += (100 - sum);
      }
      break;
    }

    case 'balanced':
    default: {
      // Linear distribution based on rank
      for (let rank = 1; rank <= count; rank++) {
        allocations.push(linearAllocation(rank, count));
      }
      // Adjust for rounding errors
      const sum = allocations.reduce((a, b) => a + b, 0);
      if (sum !== 100 && allocations.length > 0) {
        allocations[0] += (100 - sum);
      }
      break;
    }
  }

  return allocations;
}

/**
 * Apply allocations to ranked item IDs
 * @param {string[]} rankedIds - Array of item IDs in rank order
 * @param {'balanced' | 'oneFavorite' | 'topHeavy'} preset - Curve type
 * @returns {Object} - Map of itemId -> points
 */
export function allocateToItems(rankedIds, preset = 'balanced') {
  const allocations = generateAllocation(rankedIds.length, preset);
  const weights = {};

  rankedIds.forEach((id, index) => {
    weights[id] = allocations[index];
  });

  return weights;
}

/**
 * Normalize weights to sum to 100
 * @param {Object} weights - Map of itemId -> points
 * @returns {Object} - Normalized weights
 */
export function normalizeWeights(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [_, value]) => sum + value, 0);

  if (total === 0) return weights;

  const normalized = {};
  let runningSum = 0;

  entries.forEach(([id, value], index) => {
    if (index === entries.length - 1) {
      // Last item gets remainder to ensure exact 100
      normalized[id] = 100 - runningSum;
    } else {
      normalized[id] = Math.round((value / total) * 100);
      runningSum += normalized[id];
    }
  });

  return normalized;
}

/**
 * Validate weights sum to 100
 * @param {Object} weights - Map of itemId -> points
 * @returns {boolean}
 */
export function validateWeights(weights) {
  const total = Object.values(weights).reduce((sum, v) => sum + v, 0);
  return total === 100;
}

/**
 * Get preset metadata for UI display
 */
export const WEIGHT_PRESETS = {
  balanced: {
    key: 'balanced',
    label: 'Balanced',
    description: 'Steady decline from #1 to last',
    icon: '\\u2581\\u2582\\u2583\\u2584\\u2585\\u2586\\u2587\\u2588', // ascending blocks
  },
  oneFavorite: {
    key: 'oneFavorite',
    label: 'One Favorite',
    description: 'Your #1 stands alone',
    icon: '\\u2588\\u2582\\u2581\\u2581\\u2581\\u2581\\u2581\\u2581', // one tall, rest short
  },
  topHeavy: {
    key: 'topHeavy',
    label: 'Top 3',
    description: 'Top 3 are your essentials',
    icon: '\\u2588\\u2588\\u2588\\u2584\\u2582\\u2581\\u2581\\u2581', // three tall, decline
  },
};

export default {
  linearAllocation,
  generateAllocation,
  allocateToItems,
  normalizeWeights,
  validateWeights,
  WEIGHT_PRESETS,
};
