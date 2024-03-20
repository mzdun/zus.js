export async function getZusTab() {
    const window = await chrome.windows.getCurrent();
    const windowId = window.id;

    const tabs = await chrome.tabs.query({ url: 'https://www.zus.pl/portal/*', windowId });

    const winDistance = (tab?: chrome.tabs.Tab) => {
        return tab?.windowId === windowId ? 0 : 1;
    };

    const BEST = 0;
    const ALL_RIGHT = 1;
    const WORST = 2;
    const UNQUALIFIED = 3;

    const { category, tab } = tabs
        .map((tab) => {
            const { id, url } = tab;
            if (url === undefined) return { id, url, category: UNQUALIFIED };
            let category = UNQUALIFIED;
            const path = new URL(url).pathname;
            if (path === '/portal/eplMain.npi') {
                category = BEST;
            } else if (path === '/portal/logowanie.npi') {
                category = WORST;
            } else if (path.startsWith('/portal/obszar-')) {
                category = ALL_RIGHT;
            }
            return { tab, category };
        })
        .sort((a, b) =>
            a.category === b.category ? winDistance(a.tab) - winDistance(b.tab) : a.category - b.category,
        )[0] ?? { category: UNQUALIFIED };
    const tabId = tab?.id;

    if (category === UNQUALIFIED || tabId === undefined) {
        await chrome.tabs.create({ url: 'https://www.zus.pl/portal/eplMain.npi' });
        return;
    } else if (category === WORST) {
        await chrome.tabs.update(tabId, { active: true });
        return;
    } else if (category === ALL_RIGHT) {
        return await chrome.tabs.update(tabId, { active: true, url: 'https://www.zus.pl/portal/eplMain.npi' });
    } else {
        return await chrome.tabs.update(tabId, { active: true });
    }
}
