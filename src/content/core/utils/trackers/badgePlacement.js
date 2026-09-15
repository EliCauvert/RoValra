import { getAuthenticatedUserId } from '../../user';

const PLACEMENT_DATA_KEY = 'rovalra_badge_placements_v1';

// The recorded value is the badge's awardedCount at the moment the
// background scan first saw the user had it - see background.js's
// mergePlacementsIntoAggregated for why this only exists for badges
// earned after placement tracking started.
export async function getBadgePlacement(badgeId) {
    const userId = await getAuthenticatedUserId();
    if (!userId) return null;

    const result = await chrome.storage.local.get([PLACEMENT_DATA_KEY]);
    const allData = result[PLACEMENT_DATA_KEY] || {};
    const entry = allData[userId]?.badges?.[String(badgeId)];
    return entry?.awardedCount ?? null;
}
