import '@material/web/dialog/dialog.js';
import '@material/web/textfield/filled-text-field.js';
import '@material/web/icon/icon.js';
import '@material/web/tabs/primary-tab.js';
import '@material/web/tabs/tabs.js';

import { MdDialog } from '@material/web/dialog/dialog.js';
import { MdTabs } from '@material/web/tabs/tabs.js';
import { html, LitElement, PropertyValues } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

import { Rate, storage, LocalStorageData } from '../../utils/storage';
import { ValidationErrorsEvent } from '../insured-editor-dialog/insured-editor-dialog';
import { AMOUNTS, HISTORICAL_AMOUNTS, Input, onCancel, RATES, SCALAR_RATES } from '../ui';

import styles from './properties-editor-dialog.scss';

interface Property<T> {
    id: string;
    value: T;
}

@customElement('properties-editor-dialog')
export class PropertiesEditorDialog extends LitElement {
    static styles = styles;

    @query('md-dialog') accessor dialog: MdDialog | undefined = undefined;
    @query('form') accessor form: HTMLFormElement | undefined = undefined;
    @query('md-tabs') accessor tabs: MdTabs | undefined = undefined;

    currentPanel: HTMLElement | null = null;

    @state() accessor amounts: Property<number>[] = [];
    @state() accessor scalarRates: Property<number>[] = [];
    @state() accessor rates: Property<Rate>[] = [];

    //    ###    ########  ####
    //   ## ##   ##     ##  ##
    //  ##   ##  ##     ##  ##
    // ##     ## ########   ##
    // ######### ##         ##
    // ##     ## ##         ##
    // ##     ## ##        ####

    async show(data: LocalStorageData) {
        this.form?.reset();

        const historicalAmounts = HISTORICAL_AMOUNTS.map(
            ({ getter }) => <Property<number>>{ id: getter, value: data[getter] ?? 0 },
        );
        const amounts = AMOUNTS.map(({ getter }) => <Property<number>>{ id: getter, value: data[getter] ?? 0 });
        const scalarRates = SCALAR_RATES.map(
            ({ getter }) => <Property<number>>{ id: getter, value: data[getter] ?? 0 },
        );
        const rates = RATES.map(({ getter }) => <Property<Rate>>{ id: getter, value: data[getter] ?? {} });

        this.amounts = [...historicalAmounts, ...amounts];
        this.scalarRates = scalarRates;
        this.rates = rates;

        this.dialog?.show();
    }

    // ######## ##     ## ######## ##    ## ########  ######
    // ##       ##     ## ##       ###   ##    ##    ##    ##
    // ##       ##     ## ##       ####  ##    ##    ##
    // ######   ##     ## ######   ## ## ##    ##     ######
    // ##        ##   ##  ##       ##  ####    ##          ##
    // ##         ## ##   ##       ##   ###    ##    ##    ##
    // ########    ###    ######## ##    ##    ##     ######

    #onClosed = async () => {
        if (this.dialog?.returnValue !== 'ok') return;

        try {
            const next = await validateEditor(this);
            if (!next) return;

            const data = await storage.local.get();
            await storage.local.set({ ...data, ...next });
        } catch (e) {
            if (!Array.isArray(e)) throw e;
            this.dispatchEvent(new ValidationErrorsEvent(e as string[]));
        }
    };

    #onTabChange = () => {
        const { tabs } = this;
        if (!tabs) return;

        if (this.currentPanel) this.currentPanel.hidden = true;
        const panelId = tabs.activeTab?.getAttribute('aria-controls');
        const root = tabs.getRootNode() as Document | ShadowRoot;
        this.currentPanel = root.querySelector<HTMLElement>(`#${panelId}`);
        if (this.currentPanel) this.currentPanel.hidden = false;
    };

    override firstUpdated(changedProperties: PropertyValues) {
        super.firstUpdated(changedProperties);

        this.currentPanel = this.shadowRoot?.querySelector<HTMLElement>('#panel-amounts') ?? null;
    }

    // ########  ######## ##    ## ########  ######## ########
    // ##     ## ##       ###   ## ##     ## ##       ##     ##
    // ##     ## ##       ####  ## ##     ## ##       ##     ##
    // ########  ######   ## ## ## ##     ## ######   ########
    // ##   ##   ##       ##  #### ##     ## ##       ##   ##
    // ##    ##  ##       ##   ### ##     ## ##       ##    ##
    // ##     ## ######## ##    ## ########  ######## ##     ##

    #value<T>(items: Property<T>[], key: string) {
        return items.find((item) => item.id === key)?.value;
    }

    #renderInput({ label, id, autofocus }: Input, value: string | undefined) {
        return html`
            <md-filled-text-field
                label=${label}
                name=${id}
                id=${id}
                type="number"
                inputmode="decimal"
                step=".01"
                ?autofocus=${autofocus}
                value=${ifDefined(value)}
                min="0"
            ></md-filled-text-field>
        `;
    }

    #renderForm() {
        return html`
            <form slot="content" id="form" method="dialog" class="contentz">
                <div id="panel-amounts" class="section" role="tabpanel">
                    ${[...HISTORICAL_AMOUNTS, ...AMOUNTS].map(({ label, getter }) =>
                        this.#renderInput(
                            {
                                label: `${label} (z\u0142)`,
                                id: getter,
                            },
                            (this.#value(this.amounts, getter) ?? 0).toFixed(2),
                        ),
                    )}
                    ${SCALAR_RATES.map(({ label, getter }) =>
                        this.#renderInput(
                            {
                                label: `${label} (%)`,
                                id: getter,
                            },
                            (this.#value(this.scalarRates, getter) ?? 0).toFixed(2),
                        ),
                    )}
                </div>
                <div id="panel-rates" class="section" role="tabpanel" hidden>
                    ${RATES.map(({ label, getter }) => {
                        const { total, insured } = this.#value(this.rates, getter) ?? { total: 0 };
                        const split = insured !== undefined;
                        const totalCell = this.#renderInput(
                            {
                                label: split ? `Ca\u0142o\u015b\u0107 (%)` : '',
                                id: `${getter}.total`,
                                type: 'number',
                                inputMode: 'decimal',
                                step: '.01',
                            },
                            total.toFixed(2),
                        );
                        const employeeCell = split
                            ? this.#renderInput(
                                  {
                                      label: `Ubezpieczony (%)`,
                                      id: `${getter}.insured`,
                                      type: 'number',
                                      inputMode: 'decimal',
                                      step: '.01',
                                  },
                                  insured.toFixed(2),
                              )
                            : undefined;
                        const labelElement = split
                            ? html`<label for="${getter}.total">${label}</label>`
                            : html`<label for="${getter}.total">${label} (%)</label>`;
                        const row = split ? html`<div class="row">${totalCell}${employeeCell}</div>` : totalCell;
                        return html`${labelElement}${row}`;
                    })}
                </div>
            </form>
        `;
    }

    override render() {
        return html`
            <md-dialog @closed=${this.#onClosed} @cancel=${onCancel(this, 'md-dialog')}>
                <div slot="headline" class="column">
                    <md-tabs @change=${this.#onTabChange}>
                        <md-primary-tab id="tab-amounts" aria-controls="panel-amounts" inline-icon>
                            <md-icon slot="icon">payments</md-icon>
                            Stawki
                        </md-primary-tab>
                        <md-primary-tab id="tab-rates" aria-controls="panel-rates" inline-icon>
                            <md-icon slot="icon">show_chart</md-icon>
                            Przeliczniki
                        </md-primary-tab>
                    </md-tabs>
                </div>
                ${this.#renderForm()}
                <div slot="actions">
                    <md-text-button form="form" value="reset" type="reset"> Resetuj </md-text-button>
                    <div style="flex: 1"></div>
                    <md-text-button form="form" value="cancel"> Anuluj </md-text-button>
                    <md-filled-tonal-button form="form" value="ok" type="submit"> Zapisz </md-filled-tonal-button>
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

        const value = child.valueAsNumber;
        dest[leaf] = isNaN(value) ? 0 : value;
    }

    if (errors.length > 0) throw errors;

    return data as Partial<LocalStorageData>;
}
