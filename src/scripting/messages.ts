import { DRAReport } from '../reports/dra';
import { RCAReport } from '../reports/rca';
import { Report } from '../reports/model';

export enum MessageName {
    STORE = 'STORE',
    STEP = 'STEP',
    ERROR = 'ERROR',
    BREAK = 'BREAK',
}

export interface PanelMessageBase {
    type: MessageName;
}

export interface StorePanelMessage extends PanelMessageBase {
    type: MessageName.STORE;
    reports: Report[];
    rcaReports: RCAReport[];
    draReport: DRAReport | unknown;
}

export interface StepPanelMessage extends PanelMessageBase {
    type: MessageName.STEP;
    step: number;
    count?: number;
    log?: string;
}

export interface BreakPanelMessage extends PanelMessageBase {
    type: MessageName.BREAK;
}

export interface ErrorPanelMessage extends PanelMessageBase {
    type: MessageName.ERROR;
    message: string;
    source?: string;
}

export interface PanelMessageMap {
    [MessageName.STORE]: StorePanelMessage;
    [MessageName.STEP]: StepPanelMessage;
    [MessageName.BREAK]: BreakPanelMessage;
    [MessageName.ERROR]: ErrorPanelMessage;
}

export type PanelMessage = PanelMessageMap[keyof PanelMessageMap];

export abstract class PortBase {
    constructor(protected readonly port: chrome.runtime.Port) {
        port.onMessage.addListener((msg) => this.onMessage(msg));
    }

    protected abstract register<T extends MessageName>(name: T, cb: (msg: PanelMessageMap[T]) => unknown): void;

    protected registerBound<T extends MessageName>(name: T, cb: (msg: PanelMessageMap[T]) => unknown) {
        this.register<T>(name, (cb as (_: PanelMessage) => unknown).bind(this));
    }

    protected abstract onMessage(message: PanelMessage): void;

    protected post(message: PanelMessage) {
        this.port.postMessage(message);
    }

    postError(message: string, source?: string) {
        this.post({ type: MessageName.ERROR, message, source });
    }
}

export class CallbackPort extends PortBase {
    readonly listeners: Partial<Record<MessageName, (_: PanelMessage) => unknown>> = {};

    protected register<T extends MessageName>(name: T, cb: (msg: PanelMessageMap[T]) => unknown) {
        this.listeners[name] = cb as (_: PanelMessage) => unknown;
    }

    protected onMessage(message: PanelMessage) {
        const cb = this.listeners[message.type];
        cb?.(message);
    }
}

export class MessageEvent extends Event {
    constructor(public readonly msg: PanelMessageBase) {
        super(msg.type);
    }
}

export class EventEmitterPort extends PortBase {
    readonly target = new EventTarget();

    protected register<T extends MessageName>(name: T, cb: (msg: PanelMessageMap[T]) => unknown) {
        const handler = (event: MessageEvent) => {
            cb(event.msg as PanelMessageMap[T]);
        };
        this.target.addEventListener(name, handler as EventListener);
    }

    protected onMessage(message: PanelMessage) {
        this.target.dispatchEvent(new MessageEvent(message));
    }
}
