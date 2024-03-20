import { Report } from '../reports/model';
import { BreakPanelMessage, MessageName, EventEmitterPort, StorePanelMessage } from './messages';
import { INTERVAL, ScriptContext, TIMEOUT, oneShot } from './model';
import { sleepFor } from './timers';

export function createEmptyReport(reportName: 'ZUS DRA' | 'ZUS RCA') {
    const doc = new ScriptContext();
    // let radioButtonId = '';

    return doc
        .queryOr(
            '#listaTypowDokumentow',
            () => {
                const EPL00012 = document.querySelector<HTMLElement>('#EPL0012');
                EPL00012?.click();
                return !!EPL00012;
            },
            'Nie mog\u0119 odnale\u017a\u0107 listy dokument\u00f3w',
        )
        .then((list) =>
            list?.queryAll<HTMLTableRowElement>({
                selector: '#GridTypowDokumentow .dojoxGridMasterView table tr',
                errorMessage: `Nie mog\u0119 odnale\u017a\u0107 prze\u0142\u0105cznika odpowiedzialnego za dodanie raportu typu "${reportName}"`,
                reduce(elements) {
                    const rows = Array.from(elements);
                    const db = Object.fromEntries(
                        rows.map((row): [string, HTMLTableRowElement] => {
                            const cells = row.cells;
                            return [cells[2].innerText, row];
                        }),
                    );

                    const row = db[reportName];
                    if (!row) return null;

                    return row;
                },
            }),
        )
        .then((row) => row?.click())
        .then(() =>
            doc.queryAndClick(
                '#typeDokDodajBtnId',
                'Nie mog\u0119 odnale\u017a\u0107 przycisku dodawania pustego dokumentu',
            ),
        )
        .then(() =>
            doc.query<HTMLIFrameElement>('#html-form-iframe', 'Nie mog\u0119 odnale\u017a\u0107 nowego dokumentu'),
        )
        .then((ctx) =>
            ctx?.run((frame) => oneShot(frame, 'load', 'Nowy pusty dokument \u0142aduje si\u0119 zbyt wolno')),
        );
}

async function fillReport(report: Report, doc: ScriptContext) {
    const reportData = report.sections
        .map(({ id, fields }) => {
            const prefix = `_${id.replace(/\./g, '-C1_')}_p`;
            const address = `${id}, p. `;
            return fields
                .map(({ id: pole, value }): [string, string, string][] => {
                    const key = `${prefix}${pole}`;
                    const fieldAddress = `${address}${pole}`;
                    if (Array.isArray(value)) {
                        return value.map((fld, index) => [`${key}_p${index + 1}`, `${fld}`, fieldAddress]);
                    }
                    if (typeof value === 'number') {
                        return [[key, value.toFixed(2), fieldAddress]];
                    }
                    return [[key, `${value}`, fieldAddress]];
                })
                .flat();
        })
        .flat();

    for (const [key, value, errorAddress] of reportData) {
        const input = await doc.query<HTMLInputElement>({ selector: `#${key}`, justOnce: true });
        if (input?.ctx) {
            console.log(`[zus.js] ${key} -> "${value}"`);
            input.ctx.value = value;
        } else {
            throw `Nie mo\u017cna by\u0142o ustali\u0107 pola dla sekcji ${errorAddress}`;
        }
    }
}

async function pgwModal(
    doc: ScriptContext,
    {
        topBarSelector,
        shortText,
        closeSelector,
    }: {
        topBarSelector: string;
        shortText: string;
        closeSelector: string;
    },
) {
    return doc
        .queryAndClick(
            topBarSelector,
            'Nie mog\u0119 odnale\u017a\u0107 w\u0142a\u015bciwego przycisku nad formularzem',
        )
        .then(() => sleepFor(200))
        .then(() => doc.query('#pgwModal', 'Nie mog\u0119 odnale\u017a\u0107 okienka dialogowego'))
        .then((modal) =>
            modal
                ?.query({
                    selector: '.short-text',
                    errorMessage: `Nie mog\u0119 odnale\u017a\u0107 okna dialogowego "${shortText}"`,
                    timeout: TIMEOUT * 10,
                    interval: INTERVAL * 3,
                })
                .then((btn) =>
                    btn?.waitForText({
                        innerText: shortText,
                        errorMessage: `Nie mog\u0119 odnale\u017a\u0107 okna dialogowego "${shortText}"`,
                        timeout: TIMEOUT * 10,
                    }),
                )
                .then(() => modal),
        )
        .then((modal) =>
            modal?.waitForDisplay({
                display: 'block',
                errorMessage: `Okno dialogowe "${shortText}" nie pokaza\u0142o si\u0119 w oczekiwanym czasie`,
                timeout: TIMEOUT * 10,
            }),
        )
        .then((modal) => sleepFor(200).then(() => modal))
        .then((modal) =>
            modal?.queryAndClick(
                closeSelector,
                `Nie mog\u0119 odnale\u017a\u0107 przycisku zamykaj\u0105cego okno dialogowe "${shortText}"`,
            ),
        )
        .then((closeBtn) => sleepFor(200).then(() => closeBtn ?? null));
}

export class Port extends EventEmitterPort {
    listen() {
        this.registerBound(MessageName.STORE, this.#onStore);
        this.registerBound(MessageName.BREAK, this.#onBreak);
    }

    postStep(step: number, count?: number, log?: string) {
        this.post({ type: MessageName.STEP, step, count, log });
    }

    async #fillReport(report: Report, stepOffset: number, count: number | undefined) {
        //////////////////////////////////////////////////////////////////////////////
        this.postStep(stepOffset, count, `Tworz\u0119 pusty raport dla ${report.title}`);
        const reportIFrame = await createEmptyReport(report.type);
        const reportDoc = ((iframe) => {
            if (!iframe?.contentDocument) return null;
            return ScriptContext.iframe(iframe.contentDocument);
        })(reportIFrame);

        if (!reportDoc) throw `Nie mo\u017cna by\u0142o stworzy\u0107 raportu ${report.type}`;
        await reportDoc
            .query({ selector: '.ajax-loader', justOnce: true })
            .then((loader) => loader?.waitForDisplay({ display: 'none' }));
        await sleepFor(1000);
        console.log('ready to fill the report...');

        //////////////////////////////////////////////////////////////////////////////
        this.postStep(stepOffset + 1, count, `Wype\u0142niam ${report.title}`);
        const fillMessage = await fillReport(report, reportDoc);
        if (fillMessage !== undefined) throw `${fillMessage} podczas wype\u0142niania raport ${report.title}`;

        //////////////////////////////////////////////////////////////////////////////
        this.postStep(stepOffset + 2, count, `Zapisuj\u0119 ${report.title}`);
        const pmClose = await pgwModal(reportDoc, {
            topBarSelector: '#send-form',
            shortText: `Dokument ${report.type} zosta\u0142 zapisany.`,
            closeSelector: '.pm-close',
        });
        if (!pmClose?.ctx) throw `Nie mo\u017cna by\u0142o zapisa\u0107 raportu ${report.type}`;

        //////////////////////////////////////////////////////////////////////////////
        this.postStep(stepOffset + 3, count, `Zamykam ${report.title}`);
        const closeFormBtn = await pgwModal(reportDoc, {
            topBarSelector: '#close-form-fake',
            shortText: 'Czy na pewno chcesz zamkn\u0105\u0107 formularz?',
            closeSelector: '#popup-close-form-btn',
        });
        if (!closeFormBtn?.ctx) throw `Nie mo\u017cna by\u0142o zamkn\u0105\u0107 raportu ${report.type}`;
    }

    async #onStore({ reports }: StorePanelMessage) {
        console.log(reports);
        let source: string | undefined;
        try {
            const count = reports.length * 4 + 1;
            let offset = 1;
            for (const report of reports) {
                source = report.type;
                await this.#fillReport(report, offset, count);
                offset += 4;
            }
            this.postStep(count, count);
        } catch (e) {
            console.error(e);
            if (typeof e === 'string') this.postError(e, source);
        }
    }

    #onBreak(_: BreakPanelMessage) {
        console.log(_);
    }
}
