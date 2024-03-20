import { DRAReport } from '../reports/dra';
import { RCAReport } from '../reports/rca';
import { Report } from '../reports/model';

import { MessageName, CallbackPort } from './messages';

export class Port extends CallbackPort {
    listen({
        onStep,
        onError,
    }: {
        onStep?: (step: number, count?: number, log?: string) => unknown;
        onError?: (message: string, source?: string) => unknown;
    }) {
        if (onStep) this.register(MessageName.STEP, ({ step, count, log }) => onStep(step, count, log));
        if (onError) this.register(MessageName.ERROR, ({ message, source }) => onError(message, source));
    }

    postStore(reports: Report[], rcaReports: RCAReport[], draReport: DRAReport | unknown) {
        this.post({ type: MessageName.STORE, reports, rcaReports, draReport });
    }

    postBreak() {
        this.post({ type: MessageName.BREAK });
    }
}

type WindowEx = typeof window & { panelPort: Port };

export const win = window as WindowEx;
