import { timedCall, timedRepeatedCall } from './timers';

export enum ActionType {
    QUERY = 'query',
    CLICK = 'click',
    CB = 'cb',
    FILL_REPORT = 'fill',
}

export const TIMEOUT = 5_000;
export const INTERVAL = 500;

export interface CommonAction {
    type: ActionType;
}

export interface CallbackAction {
    type: ActionType.CB;
    cb: () => unknown;
}

export interface QueryAction {
    type: ActionType.QUERY;
    selector: string;
    justOnce?: boolean;
    parent?: HTMLElement;
}

export type Action = CallbackAction | QueryAction;

export interface Step {
    name: string;
    actions: Action[];
}

function objectName(elem: Element) {
    const id = elem.id ? `#${elem.id}` : '';
    const classes =
        id === ''
            ? elem.className
                  .split(' ')
                  .filter((cl) => cl.length)
                  .map((cl) => `.${cl}`)
                  .join('')
            : '';
    return `${elem.localName}${id}${classes}`;
}

export function runQuery<T extends Element>({
    selector,
    errorMessage,
    justOnce,
    timeout = TIMEOUT,
    interval = INTERVAL,
    parent,
    doc,
}: {
    selector: string;
    errorMessage?: string;
    justOnce?: boolean;
    timeout?: number;
    interval?: number;
    parent?: Element | null;
    doc?: Document;
}) {
    const root = parent ?? doc ?? document;
    return new Promise<T | null>((resolve, reject) => {
        console.log(`[zus.js] query("${selector}")...`);
        const result = root.querySelector<T>(selector);
        if (result || justOnce) {
            resolve(result);
            return;
        }

        timedRepeatedCall({
            timeout,
            interval,
            label: `query("${selector}")`,
            onTimeout: () => (errorMessage ? reject(errorMessage) : resolve(null)),
            onTick: (timer) => {
                const result = root.querySelector<T>(selector);
                if (result === null) return true;
                if (timer.cancel()) resolve(result);
                return false;
            },
        });
    });
}

export function runQueryAll<T extends Element>({
    selector,
    justOnce,
    errorMessage,
    timeout = TIMEOUT,
    interval = INTERVAL,
    parent,
    doc,
}: {
    selector: string;
    errorMessage?: string;
    justOnce?: boolean;
    timeout?: number;
    interval?: number;
    parent?: Element | null;
    doc?: Document;
}) {
    const root = parent ?? doc ?? document;
    return new Promise<NodeListOf<T>>((resolve, reject) => {
        console.log(`[zus.js] queryAll("${selector}")...`);
        const result = root.querySelectorAll<T>(selector);
        if (result.length > 0 || justOnce) {
            resolve(result);
            return;
        }

        timedRepeatedCall({
            timeout,
            interval,
            label: `query("${selector}")`,
            onTimeout: () => (errorMessage ? reject(errorMessage) : resolve(new NodeList() as NodeListOf<T>)),
            onTick: (timer) => {
                const result = root.querySelectorAll<T>(selector);
                if (result.length === 0) return true;
                if (timer.cancel()) resolve(result);
                return false;
            },
        });
    });
}

function isPromise<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
    return (
        value instanceof Promise ||
        ((value as PromiseLike<T>).then !== undefined && (value as PromiseLike<T>).then instanceof Function)
    );
}

function computedStyle(ctx: HTMLElement | null) {
    if (!ctx) return null;
    return window.getComputedStyle(ctx);
}

export function oneShot<T extends EventTarget>(target: T, eventName: string, errorMessage?: string) {
    return new Promise<T | null>((resolve, reject) => {
        timedCall({
            timeout: TIMEOUT,
            id: `on${eventName}`,
            onTimeout: () => (errorMessage ? reject(errorMessage) : resolve(null)),
            call: (timer) => {
                const handler = () => {
                    timer.cancel();
                    if (target instanceof HTMLElement) {
                        console.log(`[zus.js] fired '${eventName}'\n    at ${objectName(target)}`);
                    }
                    target.removeEventListener(eventName, handler);
                    if (!timer.activated) resolve(target);
                };
                target.addEventListener(eventName, handler);
            },
        });
    });
}

export interface QueryOptions {
    selector: string;
    errorMessage?: string;
    justOnce?: boolean | undefined;
    timeout?: number | undefined;
    interval?: number | undefined;
}

export class ScriptContext<T extends HTMLElement = HTMLElement> {
    constructor(
        public readonly ctx: T | null = null,
        public readonly doc: Document | undefined = undefined,
    ) {}

    static iframe<T2 extends HTMLElement = HTMLElement>(frame: Document) {
        return new ScriptContext<T2>(null, frame);
    }

    run<R>(cb: (elem: T) => R): R | null {
        if (!this.ctx) return null;
        return cb(this.ctx);
    }

    async query<T2 extends HTMLElement = HTMLElement>(optionsOrSelector: string | QueryOptions, errorMessage?: string) {
        const next =
            typeof optionsOrSelector === 'string'
                ? await runQuery<T2>({ selector: optionsOrSelector, errorMessage, parent: this.ctx, doc: this.doc })
                : await runQuery<T2>({
                      selector: optionsOrSelector.selector,
                      errorMessage: optionsOrSelector.errorMessage ?? errorMessage,
                      justOnce: optionsOrSelector.justOnce,
                      timeout: optionsOrSelector.timeout,
                      interval: optionsOrSelector.interval,
                      parent: this.ctx,
                      doc: this.doc,
                  });
        if (!next) return null;
        console.log(
            `[zus.js] using "${typeof optionsOrSelector === 'string' ? optionsOrSelector : optionsOrSelector.selector}"
    found ${objectName(next)}
    within ${this.ctx ? objectName(this.ctx) : 'the document'}`,
        );

        return new ScriptContext<T2>(next);
    }

    async queryOr<T2 extends HTMLElement = HTMLElement>(selector: string, cb: () => boolean, errorMessage?: string) {
        const result = await this.query<T2>({ selector, justOnce: true });
        if (result) return result;
        if (!cb()) return null;
        return await this.query<T2>({ selector, errorMessage });
    }

    async queryAndClick<T2 extends HTMLElement = HTMLElement>(
        optionsOrSelector: string | QueryOptions,
        errorMessage?: string,
    ) {
        const target = await this.query<T2>(optionsOrSelector, errorMessage);
        target?.click();
        return target;
    }

    async queryAll<T2 extends HTMLElement = HTMLElement>({
        selector,
        errorMessage,
        justOnce,
        timeout,
        interval,
        reduce,
    }: {
        selector: string;
        errorMessage?: string;
        justOnce?: boolean;
        timeout?: number;
        interval?: number;
        reduce: (elements: NodeListOf<T2>) => T2 | null | PromiseLike<T2 | null>;
    }) {
        const list = await runQueryAll<T2>({
            selector,
            errorMessage,
            justOnce,
            timeout,
            interval,
            parent: this.ctx,
            doc: this.doc,
        });
        const maybePromise = reduce(list);
        const next = isPromise(maybePromise) ? await maybePromise : maybePromise;
        if (!next) return null;
        console.log(
            `[zus.js] using "${selector}"
    found ${objectName(next)}
    from ${list.length} node${list.length === 1 ? '' : 's'}
    within ${this.ctx ? objectName(this.ctx) : 'the document'}`,
        );

        return new ScriptContext<T2>(next);
    }

    click() {
        if (!this.ctx) return null;
        console.log(`[zus.js] clicking on
    ${objectName(this.ctx)}`);
        this.ctx.click();
        return this;
    }

    async waitForDisplay({
        display,
        errorMessage,
        timeout = TIMEOUT,
    }: {
        display: string;
        errorMessage?: string;
        timeout?: number;
    }) {
        const wasCorrect = computedStyle(this.ctx)?.display === display;
        if (wasCorrect) {
            console.log(`[zus.js] ${objectName(this.ctx!)}
    display already was ${display}`);
            return this;
        }

        const target = this.ctx!;

        return new Promise<ScriptContext<T> | null>((resolve, reject) => {
            timedCall({
                timeout,
                id: `"display: ${display}"`,
                onTimeout: () => (errorMessage ? reject(errorMessage) : resolve(null)),
                call: (timer) => {
                    const observer = new MutationObserver((list) => {
                        list.find((mutation) => {
                            const { type, attributeName } = mutation;
                            if (type !== 'attributes' || (attributeName !== 'style' && attributeName !== 'class'))
                                return false;
                            const isCorrect = computedStyle(mutation.target as HTMLElement)?.display === display;
                            const justBecameCorrect = isCorrect !== wasCorrect;
                            if (justBecameCorrect) {
                                timer.cancel();
                                observer.disconnect();
                                console.log(`[zus.js] ${objectName(mutation.target as HTMLElement)}
    display became ${display}`);
                                if (!timer.activated) resolve(this);
                            }
                            return justBecameCorrect;
                        });
                    });

                    observer.observe(target, { attributes: true, attributeFilter: ['style', 'class'] });
                },
            });
        });
    }

    async waitForText({
        innerText,
        errorMessage,
        timeout = TIMEOUT,
    }: {
        innerText: string;
        errorMessage?: string;
        timeout?: number;
    }) {
        const wasCorrect = this.ctx?.innerText === innerText;
        if (wasCorrect) {
            console.log(`[zus.js] ${objectName(this.ctx!)}
    innerText already was "${innerText}"`);
            return this;
        }

        const target = this.ctx!;

        return new Promise<ScriptContext<T> | null>((resolve, reject) => {
            timedCall({
                timeout,
                id: `innerText === "${innerText}"`,
                onTimeout: () => (errorMessage ? reject(errorMessage) : resolve(null)),
                call: (timer) => {
                    console.log(`[zus.js] looking for
    innerText "${innerText}"
    in ${objectName(target)}
    (${target.innerText})`);
                    const observer = new MutationObserver((list) => {
                        list.find((mutation) => {
                            const { type } = mutation;
                            if (type !== 'characterData') return false;
                            const isCorrect = (mutation.target as HTMLElement).innerText === innerText;
                            const justBecameCorrect = isCorrect !== wasCorrect;
                            if (justBecameCorrect) {
                                timer.cancel();
                                observer.disconnect();
                                console.log(`[zus.js] ${objectName(mutation.target as HTMLElement)}
    innerText became "${innerText}"`);
                                if (!timer.activated) resolve(this);
                            }
                            return justBecameCorrect;
                        });
                    });

                    observer.observe(target, { characterData: true });
                },
            });
        });
    }
}
