import '@material/web/button/filled-button.js';
import '@material/web/button/filled-tonal-button.js';
import '@material/web/button/text-button.js';
import '@material/web/dialog/dialog.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/textfield/filled-text-field.js';

import { MdDialog } from '@material/web/dialog/dialog.js';
import { html, LitElement } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';

import { storage, SessionStorageData, lastMonthEx } from '../../utils/storage';
import { ValidationErrorsEvent } from '../insured-editor-dialog/insured-editor-dialog';
import { onCancel } from '../ui';

import styles from './identifier-editor-dialog.scss';

const months: string[] = [
    'stycze\u0144',
    'luty',
    'marzec',
    'kwiecie\u0144',
    'maj',
    'czerwiec',
    'lipiec',
    'sierpie\u0144',
    'wrzesie\u0144',
    'pa\u017adziernik',
    'listopad',
    'grudzie\u0144',
] as const;

const monthsShort: string[] = [
    'sty',
    'lut',
    'mar',
    'kwi',
    'maj',
    'cze',
    'lip',
    'sie',
    'wrz',
    'pa\u017a',
    'lis',
    'gru',
] as const;

@customElement('identifier-editor-dialog')
export class IdentifierEditorDialog extends LitElement {
    static styles = styles;

    @query('md-dialog') accessor dialog: MdDialog | undefined = undefined;
    @query('form') accessor form: HTMLFormElement | undefined = undefined;

    currentPanel: HTMLElement | null = null;

    @state() accessor useLastMonth: boolean = true;
    @state() accessor serial: number = 1;
    @state() accessor month: number = 1;
    @state() accessor year: number = 0;
    @state() accessor selectorType: 'hidden' | 'months' | 'years' = 'hidden';

    //    ###    ########  ####
    //   ## ##   ##     ##  ##
    //  ##   ##  ##     ##  ##
    // ##     ## ########   ##
    // ######### ##         ##
    // ##     ## ##         ##
    // ##     ## ##        ####

    async show({ serial, month, year, useLastMonth }: SessionStorageData) {
        this.form?.reset();

        this.useLastMonth = useLastMonth;
        this.serial = serial;
        this.month = month;
        this.year = year;
        this.selectorType = 'hidden';

        this.dialog?.show();
    }

    // ######## ##     ## ######## ##    ## ########  ######
    // ##       ##     ## ##       ###   ##    ##    ##    ##
    // ##       ##     ## ##       ####  ##    ##    ##
    // ######   ##     ## ######   ## ## ##    ##     ######
    // ##        ##   ##  ##       ##  ####    ##          ##
    // ##         ## ##   ##       ##   ###    ##    ##    ##
    // ########    ###    ######## ##    ##    ##     ######

    #movePeriod = (e: Event, dir: -1 | 1) => {
        e.preventDefault();

        let { year, month } = this;
        switch (this.selectorType) {
            case 'hidden':
                month += dir;
                break;
            case 'months':
                year += dir;
                break;
            case 'years':
                year += 10 * dir;
                break;
        }

        const d = new Date(year, month - 1);
        this.year = d.getFullYear();
        this.month = d.getMonth() + 1;
        this.useLastMonth = false;
    };
    #prevPeriod = (e: Event) => this.#movePeriod(e, -1);
    #nextPeriod = (e: Event) => this.#movePeriod(e, +1);

    #expandMonth = (e: Event) => {
        e.preventDefault();
        this.selectorType = 'months';
    };

    #expandYear = (e: Event) => {
        e.preventDefault();
        this.selectorType = 'years';
    };

    #selectItem(e: Event, index: number) {
        e.preventDefault();
        const showsYears = this.selectorType === 'years';
        if (showsYears) {
            this.year = this.year - 4 + index;
        } else {
            this.month = index + 1;
        }
        this.useLastMonth = false;
        this.selectorType = showsYears ? 'months' : 'hidden';
    }

    #onClosed = async () => {
        if (this.dialog?.returnValue !== 'ok') return;

        const { year, month, useLastMonth } = this;

        try {
            const next = await validateEditor(this);
            if (!next) return;

            const data = await storage.session.get();
            await storage.session.set({ ...data, year, month, useLastMonth, ...next });
        } catch (e) {
            if (!Array.isArray(e)) throw e;
            this.dispatchEvent(new ValidationErrorsEvent(e as string[]));
        }
    };

    #resetToLastMonth = (e: Event) => {
        e.preventDefault();
        const { month, year } = lastMonthEx();
        this.useLastMonth = true;
        this.month = month;
        this.year = year;
        this.selectorType = 'hidden';
    };

    // ########  ######## ##    ## ########  ######## ########
    // ##     ## ##       ###   ## ##     ## ##       ##     ##
    // ##     ## ##       ####  ## ##     ## ##       ##     ##
    // ########  ######   ## ## ## ##     ## ######   ########
    // ##   ##   ##       ##  #### ##     ## ##       ##   ##
    // ##    ##  ##       ##   ### ##     ## ##       ##    ##
    // ##     ## ######## ##    ## ########  ######## ##     ##

    #renderForm() {
        const yearsOverMonths = this.selectorType === 'years';
        const startYear = this.year - 4;
        const years = Array.from({ length: 12 }, (_, i) => `${i + startYear}`);
        const values = yearsOverMonths ? years : monthsShort;
        const selectedIndex = yearsOverMonths ? 4 : this.month - 1;

        return html`
            <form slot="content" id="form" method="dialog" class="content">
                <md-filled-text-field
                    label="Numer raportu"
                    name="serial"
                    id="serial"
                    type="number"
                    min="1"
                    max="99"
                    autofocus
                    value=${this.serial}
                ></md-filled-text-field>
                <div class="row">
                    <md-icon-button @click=${this.#prevPeriod}>
                        <md-icon>chevron_left</md-icon>
                    </md-icon-button>
                    ${this.selectorType === 'hidden'
                        ? // today
                          html`
                              <md-text-button @click=${this.#expandMonth} trailing-icon>
                                  ${months[this.month - 1]} ${this.year}
                                  <md-icon slot="icon">arrow_drop_down</md-icon>
                              </md-text-button>
                          `
                        : this.selectorType === 'months'
                          ? html`
                                <md-text-button @click=${this.#expandYear} trailing-icon>
                                    ${this.year}
                                    <md-icon slot="icon">arrow_drop_down</md-icon>
                                </md-text-button>
                            `
                          : html` <md-text-button disabled>dekada</md-text-button> `}
                    <md-icon-button @click=${this.#nextPeriod}>
                        <md-icon>chevron_right</md-icon>
                    </md-icon-button>
                </div>
                <div class="grid" ?hidden=${this.selectorType === 'hidden'}>
                    ${values.map((label, index) =>
                        index === selectedIndex
                            ? html`
                                  <md-filled-button @click=${(e: Event) => this.#selectItem(e, index)}>
                                      ${label}
                                  </md-filled-button>
                              `
                            : html`
                                  <md-text-button @click=${(e: Event) => this.#selectItem(e, index)}>
                                      ${label}
                                  </md-text-button>
                              `,
                    )}
                </div>
                ${this.useLastMonth
                    ? ''
                    : html`
                          <md-text-button @click=${this.#resetToLastMonth}>
                              Przywróć ostatni miesiąc
                              <md-icon slot="icon">calendar_today</md-icon>
                          </md-text-button>
                      `}
            </form>
        `;
    }

    override render() {
        return html`
            <md-dialog @closed=${this.#onClosed} @cancel=${onCancel(this, 'md-dialog')}>
                <div slot="headline" class="column">Identyfikator</div>
                ${this.#renderForm()}
                <div slot="actions">
                    <md-text-button form="form" value="reset" type="reset">Resetuj</md-text-button>
                    <div style="flex: 1"></div>
                    <md-text-button form="form" value="cancel">Anuluj</md-text-button>
                    <md-filled-tonal-button form="form" value="ok" type="submit">Zapisz</md-filled-tonal-button>
                </div>
            </md-dialog>
        `;
    }
}

type Dictionary = Record<string, number | Record<string, number>>;

export async function validateEditor(host: HTMLElement) {
    const form = host.shadowRoot?.querySelector('form');
    if (!form) return null;

    const data: Dictionary = {};
    const errors: string[] = [];

    for (let index = 0; index < form.length; ++index) {
        const child = form[index] as HTMLInputElement;

        const name = child.name;
        if (name === '') continue;
        const path = name.split('.');
        const leaf = path[path.length - 1];
        path.pop();

        let dest = data;
        for (const dir of path) {
            if (dest[dir] == undefined) dest[dir] = {};
            dest = dest[dir] as Record<string, number>;
        }

        const value = parseInt(child.value);
        dest[leaf] = isNaN(value) ? 0 : value;
    }

    if (errors.length > 0) throw errors;

    return data as Partial<SessionStorageData>;
}
