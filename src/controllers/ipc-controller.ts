import { ReactiveController, ReactiveControllerHost } from 'lit';
import { Report } from '../reports/model';
import { RCAReport } from '../reports/rca';
import { DRAReport } from '../reports/dra';
import { Port, win } from '../scripting/panel';
import { getZusTab } from '../scripting/tabs';

interface NotificationContext {
    notificationId: string | null;
    notify: (options: chrome.notifications.NotificationOptions) => Promise<void>;
}

export class IPCController implements ReactiveController {
    host: ReactiveControllerHost;
    active = false;
    errorMessage?: string;
    message?: string;
    step = 25;
    count?: number;

    constructor(host: ReactiveControllerHost) {
        this.host = host;
        this.host.addController(this);
    }

    hostConnected() {}
    hostDisconnected() {}

    async store(reports: Report[], rcaReports: RCAReport[], draReport: DRAReport | unknown) {
        const tab = await getZusTab();
        if (tab?.id === undefined) return;

        this.active = false;
        this.errorMessage = undefined;
        this.count = undefined;
        this.step = 0;
        this.message = undefined;
        this.host.requestUpdate();

        const ctx: NotificationContext = { notificationId: null, notify: (options) => this.#onNotify(ctx, options) };

        const port = chrome.tabs.connect(tab.id, { name: 'panel' });
        win.panelPort = new Port(port);
        win.panelPort.listen({
            onStep: (step, count, log) => this.#onStep(ctx, step, count, log),
            onError: (message, source) => this.#onError(ctx, message, source),
        });

        win.panelPort.postStore(reports, rcaReports, draReport);
    }

    async #onNotify(ctx: NotificationContext, options: chrome.notifications.NotificationOptions) {
        if (ctx.notificationId === null) {
            ctx.notificationId = (await chrome.notifications.create({
                type: 'basic',
                iconUrl: '/icons/zus.svg',
                title: 'Wype\u0142niam formularze',
                priority: 2,
                message: 'Trwa wype\u0142nianie formularzy',
                progress: 0,
                ...options,
            })) as unknown as string;
            return;
        }

        await chrome.notifications.update(ctx.notificationId, {
            type: 'basic',
            iconUrl: '/icons/zus.svg',
            title: 'Wype\u0142niam formularze',
            priority: 2,
            message: 'Trwa wype\u0142nianie formularzy',
            progress: 0,
            ...options,
        });
    }

    async #onStep(ctx: NotificationContext, step: number, count: number | undefined, log: string | undefined) {
        console.log(
            `[${chrome.runtime.getManifest().name} :: panel :: ${ctx.notificationId ?? '???'}] step ${step}/${count ?? '-'} ${log ?? ''}`,
        );
        if (step === count) {
            this.active = false;
            this.message = undefined;
            this.host.requestUpdate();
            if (!this.errorMessage) {
                await ctx.notify({
                    type: 'basic',
                    message: 'Zapis zako\u0144czony',
                });
            }
            return;
        }

        const message = log ?? 'Trwa wype\u0142nianie formularzy';
        this.active = true;
        this.errorMessage = undefined;
        this.step = step;
        this.count = count;
        this.message = message;
        this.host.requestUpdate();

        if (count === undefined) {
            await ctx.notify({
                type: 'basic',
                message,
            });
        } else {
            await ctx.notify({
                type: 'progress',
                message,
                progress: Math.floor((step * 100) / count),
            });
        }
    }

    async #onError(ctx: NotificationContext, message: string, source: string | undefined) {
        console.log(
            `[${chrome.runtime.getManifest().name} :: panel${source ? ` :: ${source}` : ''} :: ${ctx.notificationId ?? '???'}] error: ${message}`,
        );

        this.errorMessage = source ? `[${source}] ${message}` : message;
        this.message = undefined;
        this.host.requestUpdate();
        await ctx.notify({
            type: 'basic',
            message: source ? `B\u0142\u0105d: ${message} (${source})` : `B\u0142\u0105d: ${message}`,
        });
    }
}
