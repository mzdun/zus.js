import { storage, defaultLocalStorage } from '../utils/storage';

export async function getCurrentTab() {
    const queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    const [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

chrome.runtime.onInstalled.addListener(async () => {
    // Here goes everything you want to execute after extension initialization

    await storage.local.initializeWithDefaults(defaultLocalStorage);

    console.log('Extension successfully installed!');
    await chrome.runtime.openOptionsPage();
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
