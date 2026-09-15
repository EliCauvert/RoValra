import { callRobloxApi } from '../../core/api.js';
import { getBadgeIdFromUrl } from '../../core/idExtractor.js';
import { observeChildren, observeElement } from '../../core/observer.js';
import { getAuthenticatedUserId } from '../../core/user.js';
import { ts } from '../../core/locale/i18n.js';
import { settings } from '../../core/settings/getSettings.js';
import { createInteractiveTimestamp } from '../../core/ui/time/time.js';
import { getBadgePlacement } from '../../core/utils/trackers/badgePlacement.js';

const MARKER = 'data-rovalra-badge-earned-date';
const cache = new Map();
const pending = new Map();
const observed = new WeakSet();

function isValidDate(value) {
    const date = new Date(value);
    return Boolean(value) && !Number.isNaN(date.getTime());
}

async function getAwardedDate(userId, badgeId) {
    const key = `${userId}:${badgeId}`;
    if (cache.has(key)) return cache.get(key);
    if (pending.has(key)) return pending.get(key);

    const promise = callRobloxApi({
        subdomain: 'badges',
        endpoint: `/v1/users/${userId}/badges/${badgeId}/awarded-date`,
    })
        .then(async (response) => {
            if (!response.ok) {
                cache.set(key, null);
                return null;
            }
            const data = await response.json();
            const awardedDate = data?.awardedDate || data?.date;
            const validAwardedDate = isValidDate(awardedDate)
                ? awardedDate
                : null;
            cache.set(key, validAwardedDate);
            return validAwardedDate;
        })
        .catch(() => {
            cache.set(key, null);
            return null;
        })
        .finally(() => pending.delete(key));

    pending.set(key, promise);
    return promise;
}

const ordinalRules = new Intl.PluralRules('en', { type: 'ordinal' });
const ordinalSuffixes = { one: 'st', two: 'nd', few: 'rd', other: 'th' };
function formatOrdinal(n) {
    return `${n.toLocaleString()}${ordinalSuffixes[ordinalRules.select(n)]}`;
}

function getTargetDataContainer(target) {
    if (target.matches('.item-details')) return target;
    const isGrid = target
        .closest('.game-badges-list')
        ?.classList.contains('rovalra-badge-grid-view');
    return target.querySelector(
        isGrid ? '.rovalra-badge-grid-stats' : '.badge-stats-container',
    );
}

function getTargetBadgeId(target) {
    if (target.matches('.item-details')) return getBadgeIdFromUrl();
    return (
        target
            .querySelector('a[href*="/badges/"]')
            ?.href.match(/\/badges\/(\d+)/i)?.[1] || null
    );
}

function createStatRow(labelText, valueNode, isItemDetails) {
    const row = document.createElement(isItemDetails ? 'div' : 'li');
    if (isItemDetails) {
        row.className =
            'clearfix item-field-container rovalra-badge-earned-date';
        const label = document.createElement('div');
        label.className =
            'font-header-1 text-subheader text-label text-overflow field-label';
        label.textContent = labelText;
        const value = document.createElement('div');
        value.className = 'field-content';
        value.appendChild(valueNode);
        row.append(label, value);
    } else {
        row.className = 'rovalra-badge-earned-date';
        const label = document.createElement('div');
        label.className = 'text-label';
        label.textContent = labelText;
        const value = document.createElement('div');
        value.className = 'font-header-2 badge-stats-info';
        value.appendChild(valueNode);
        row.append(label, value);
    }
    return row;
}

async function update(target) {
    const isGrid = target
        .closest('.game-badges-list')
        ?.classList.contains('rovalra-badge-grid-view');
    if (isGrid) {
        target.querySelector(`[${MARKER}]`)?.remove();
        return;
    }
    const dataContainer = getTargetDataContainer(target);
    if (!dataContainer) return;
    const badgeId = getTargetBadgeId(target);
    const userId = await getAuthenticatedUserId();
    if (!badgeId || !userId) return;
    const navigationKey = `${userId}:${badgeId}`;
    const existing = dataContainer.querySelector(`[${MARKER}]`);
    if (existing?.dataset.rovalraBadgeEarnedDateKey === navigationKey) return;
    dataContainer.querySelectorAll(`[${MARKER}]`).forEach((el) => el.remove());
    dataContainer.dataset.rovalraBadgeEarnedDateNavigation = navigationKey;

    const placementEnabled = await settings.badgePlacementEnabled;
    const [awardedDate, placement] = await Promise.all([
        getAwardedDate(userId, badgeId),
        placementEnabled !== false ? getBadgePlacement(badgeId) : null,
    ]);
    if (
        dataContainer.dataset.rovalraBadgeEarnedDateNavigation !==
            navigationKey ||
        (!awardedDate && placement == null)
    )
        return;

    const isItemDetails = target.matches('.item-details');
    const rows = [];
    if (awardedDate) {
        rows.push(
            createStatRow(
                ts('badgeEarnedDate.unlocked'),
                createInteractiveTimestamp(awardedDate),
                isItemDetails,
            ),
        );
    }
    if (placement != null) {
        const value = document.createElement('span');
        value.textContent = formatOrdinal(placement);
        rows.push(
            createStatRow(
                ts('badgeEarnedDate.placement'),
                value,
                isItemDetails,
            ),
        );
    }

    rows.forEach((row) => {
        row.setAttribute(MARKER, 'true');
        row.dataset.rovalraBadgeEarnedDateKey = navigationKey;
    });

    if (isItemDetails) {
        const descriptionRow = dataContainer.querySelector(
            '.toggle-target.item-field-container',
        );
        if (descriptionRow) {
            rows.forEach((row) =>
                dataContainer.insertBefore(row, descriptionRow),
            );
            return;
        }
    }
    dataContainer.append(...rows);
}

function setup(target) {
    if (observed.has(target)) return;
    observed.add(target);
    let timer;
    const refresh = () => {
        clearTimeout(timer);
        timer = setTimeout(() => update(target), 100);
    };
    observeChildren(target, refresh);
    refresh();
}

export async function init() {
    if ((await settings.badgeEarnedDateEnabled) === false) return;
    observeElement('.item-details, .stack-row.badge-row', setup, {
        multiple: true,
    });
}

export default init;
