import { Port } from '../scripting/content';

console.log(`[zus.js] injected`);

chrome.runtime.onConnect.addListener((port) => {
    console.log(`[zus.js :: ${port.name}]`, port);
    if (port.name === 'panel') {
        const win = window as typeof window & { contentScriptPort: Port };
        win.contentScriptPort = new Port(port);
        console.log(win.contentScriptPort);
        win.contentScriptPort.listen();
    }
});
