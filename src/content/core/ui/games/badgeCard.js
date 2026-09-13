import { createThumbnailElement } from '../../thumbnail/thumbnails.js';
import { safeHtml } from '../../packages/dompurify.js';

/**
 * Creates a badge card for the "view all badges" overlays.
 * @param {Object} options
 * @param {Object} options.badge - Raw badge object from the Roblox badges API (id, name/displayName, statistics, awardingUniverse, ...).
 * @param {Object} [options.thumbnail] - Thumbnail data for this badge from fetchThumbnails(..., 'BadgeIcon', ...).
 * @param {{ rarity: string, awarded: string }} options.labels - Localized stat labels.
 */
export function createBadgeCard({ badge, thumbnail, labels }) {
    const name = badge.displayName || badge.name || `Badge ${badge.id}`;
    const stats = badge.statistics || {};
    const winRate = (stats.winRatePercentage ?? 0).toFixed(1);
    const awardedCount = (stats.awardedCount ?? 0).toLocaleString();
    const universe = badge.awardingUniverse || {};

    const card = document.createElement('div');
    card.className = 'rovalra-badge-card';

    const link = document.createElement('a');
    link.className = 'rovalra-badge-card-link';
    link.href = `https://www.roblox.com/badges/${badge.id}/${encodeURIComponent(name)}`;

    const thumbContainer = document.createElement('div');
    thumbContainer.className = 'rovalra-badge-card-thumb-container';
    thumbContainer.appendChild(
        createThumbnailElement(thumbnail, name, 'rovalra-badge-card-thumb'),
    );

    link.innerHTML = safeHtml`<div class="rovalra-badge-card-name" title="${name}">${name}</div>`;
    link.prepend(thumbContainer);

    const gameLink = document.createElement('a');
    gameLink.className = 'rovalra-badge-card-game';
    gameLink.textContent = universe.name || '';
    gameLink.title = universe.name || '';
    if (universe.rootPlaceId) {
        gameLink.href = `https://www.roblox.com/games/${universe.rootPlaceId}/unnamed`;
    }

    const statsRow = document.createElement('div');
    statsRow.className = 'rovalra-badge-card-stats';
    statsRow.innerHTML = safeHtml`
        <span class="rovalra-badge-card-stat" title="${labels.rarity}">${`${winRate}%`}</span>
        <span class="rovalra-badge-card-stat" title="${labels.awarded}">${awardedCount}</span>
    `;

    card.append(link, gameLink, statsRow);
    return card;
}
