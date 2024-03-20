export function sleepFor(millis: number) {
    return new Promise((resolve) => setTimeout(resolve, millis));
}

export class Timer {
    timer: number;
    activated = false;
    constructor(onTimeout: () => void, timeout: number, id?: string) {
        this.timer = timeout
            ? window.setTimeout(() => {
                  this.activated = true;
                  console.warn(id ? `[zus.js] timed out on ${id}` : '[zus.js] timed out');
                  onTimeout();
              }, timeout)
            : 0;
    }

    cancel() {
        window.clearTimeout(this.timer);
        this.timer = 0;
        return !this.activated;
    }
}

export function repeatedCall(interval: number, onTick: () => boolean) {
    const id = window.setInterval(() => {
        if (!onTick()) {
            window.clearInterval(id);
        }
    }, interval);
}

export function timedCall({
    timeout,
    onTimeout,
    call,
    id,
}: {
    timeout: number;
    onTimeout: () => void;
    call: (timer: Timer) => void;
    id?: string;
}) {
    call(new Timer(onTimeout, timeout, id));
}

export function timedRepeatedCall({
    timeout,
    interval,
    label,
    onTimeout,
    onTick,
}: {
    timeout: number;
    interval: number;
    label: string;
    onTimeout: () => void;
    onTick: (timer: Timer) => boolean;
}) {
    const then = performance.now();
    timedCall({
        timeout,
        onTimeout,
        call: (timer) => {
            repeatedCall(interval, () => {
                if (timer.activated) {
                    return false;
                }

                const now = performance.now();
                console.log(`[zus.js] + ${label}... [${(now - then).toFixed()} ms]`);

                const shouldContinue = onTick(timer);
                if (!shouldContinue) timer.cancel();
                return shouldContinue;
            });
        },
        id: label,
    });
}
