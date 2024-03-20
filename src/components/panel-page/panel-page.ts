import '@material/web/button/filled-tonal-button.js';
import '@material/web/button/text-button.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/list/list-item.js';
import '@material/web/list/list.js';
import '@material/web/progress/circular-progress.js';
import '@material/web/progress/linear-progress.js';
import '@material/web/tabs/primary-tab.js';
import '@material/web/tabs/tabs.js';
import '../identifier-editor-dialog/identifier-editor-dialog';

import { MdPrimaryTab } from '@material/web/tabs/primary-tab.js';
import { MdTabs } from '@material/web/tabs/tabs.js';
import { html, LitElement, nothing, PropertyValues } from 'lit';
import { customElement, query } from 'lit/decorators.js';

import { LocalStorageController, SessionStorageController } from '../../controllers/storage-controller';
import { IPCController } from '../../controllers/ipc-controller';
import { NUMBER_FORMAT, ReportField, STRING_FORMAT } from '../../reports/model';
import { roundedPLN } from '../ui';
import { IdentifierEditorDialog } from '../identifier-editor-dialog/identifier-editor-dialog';

import styles from './panel-page.scss';
import { classMap } from 'lit/directives/class-map.js';

@customElement('panel-page')
export class PanelPageElement extends LitElement {
    static styles = styles;
    #controller = new LocalStorageController(this);
    #sessionController = new SessionStorageController(this);
    #ipcController = new IPCController(this);
    #reportsWereReady = false;
    #reportsBecameReady = false;

    @query('md-tabs') accessor tabs: MdTabs | undefined = undefined;
    @query('identifier-editor-dialog') accessor identifierEditor: IdentifierEditorDialog | undefined = undefined;
    currentPanel: HTMLElement | null = null;

    #editIdentifier = async () => {
        this.identifierEditor?.show(this.#sessionController.data);
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

    override updated(changedProperties: PropertyValues) {
        super.updated(changedProperties);

        this.#controller.identifier = this.#sessionController.identifier;

        if (!this.#reportsBecameReady) return;

        this.currentPanel = this.shadowRoot?.querySelector<HTMLElement>('#summary-panel') ?? null;
    }

    #renderField = ({ id, value, format: fieldFormat }: ReportField) => {
        const format =
            fieldFormat !== undefined ? fieldFormat : typeof value === 'number' ? NUMBER_FORMAT : STRING_FORMAT;
        const { infix, prefix, suffix, align, digits } = format;
        const label = `${id}`.padStart(2, '0');
        const pres = Array.isArray(value)
            ? value.join(infix)
            : digits < 0
              ? value
              : (value as number).toLocaleString(undefined, {
                    minimumFractionDigits: digits,
                    maximumFractionDigits: digits,
                });
        const presentation = `${prefix}${pres}${suffix}`;
        return html`
            <div class="field-row grid">
                <div class="field-id">${label}</div>
                <div class="field-value field-align-${align}">${presentation}</div>
            </div>
        `;
    };

    #renderReports() {
        const { reportViews, rcaReports, reportsReady, identifier } = this.#controller;
        this.#reportsBecameReady = reportsReady && !this.#reportsWereReady;
        this.#reportsWereReady = reportsReady;
        if (this.#reportsBecameReady) console.log('reports are ready');

        if (!reportsReady) {
            return html`
                <div class="report-house">
                    <div class="report loader">
                        <md-circular-progress indeterminate></md-circular-progress>
                    </div>
                </div>
            `;
        }

        return html`
            <md-tabs @change=${this.#onTabChange} class="scrolling">
                <md-primary-tab id="summary-tab" aria-controls="summary-panel"> Podsumowanie </md-primary-tab>
                ${reportViews.map(
                    ({ id, title }) => html`
                        <md-primary-tab id="tab-${id}" aria-controls="panel-${id}"> ${title} </md-primary-tab>
                    `,
                )}
            </md-tabs>
            <div class="report-house">
                <div id="summary-panel" class="report.block">
                    <md-list>
                        <md-list-item type="button" @click=${this.#editIdentifier}>
                            <div slot="headline">Identyfikator</div>
                            <div slot="trailing-supporting-text">${identifier.join(' ')}</div>
                        </md-list-item>
                        ${rcaReports.map(
                            ({ imie, nazwisko, pesel, pensja, skladka_spoleczna, skladka_zdrowotna, podatek }) => html`
                                <md-list-item
                                    type="button"
                                    @click=${() => this.#switchTo(rcaReports.length === 1 ? 'rca' : `rca-${pesel}`)}
                                >
                                    <div slot="headline">${nazwisko}, ${imie}</div>
                                    <div slot="supporting-text">
                                        społeczne:&nbsp;${roundedPLN(skladka_spoleczna)},
                                        zdrowotne:&nbsp;${roundedPLN(skladka_zdrowotna)},
                                        podatek:&nbsp;${roundedPLN(podatek)}
                                    </div>
                                    <div slot="trailing-supporting-text">${roundedPLN(pensja.netto)}</div>
                                </md-list-item>
                            `,
                        )}
                        <md-list-item type="button" @click=${() => this.#switchTo('dra')}>
                            <div slot="headline">Dla <abbrev title="Zak\u0142adu Ubezpiecze\u0144 Socjalnych">ZUS</abbr></div>
                            <div slot="trailing-supporting-text">
                                ${roundedPLN(
                                    rcaReports.reduce(
                                        (prev, rca) => prev + rca.skladka_spoleczna + rca.skladka_zdrowotna,
                                        0,
                                    ),
                                )}
                            </div>
                        </md-list-item>
                        <md-list-item>
                            <div slot="headline">Dla Urz\u0119du Skarbowego</div>
                            <div slot="trailing-supporting-text">
                                ${roundedPLN(rcaReports.reduce((prev, rca) => prev + rca.podatek, 0))}
                            </div>
                        </md-list-item>
                    </md-list>
                </div>
                ${reportViews.map(
                    ({ id, sections }) => html`
                        <div id="panel-${id}" class="report" hidden>
                            ${sections.map(
                                ({ id: sectionId, fields }, sectionIndex) => html`
                                    ${sectionIndex === 0 ? nothing : html`<hr />`}
                                    <div class="section-id">${sectionId}</div>
                                    ${fields.filter((field) => !field.hidden).map(this.#renderField)}
                                `,
                            )}
                        </div>
                    `,
                )}
            </div>
        `;
    }

    #switchTo(reportID: string) {
        if (!this.tabs) return;
        const id = `#tab-${reportID}`;
        const tab = this.tabs.querySelector<MdPrimaryTab>(id);
        if (tab) this.tabs.activeTab = tab;
    }

    #save = async () => {
        const { reportViews, rcaReports, draReport } = this.#controller;
        this.#ipcController.store(reportViews, rcaReports, draReport);
    };

    protected render() {
        const { active, errorMessage, step, count, message } = this.#ipcController;
        return html`
            ${this.#renderReports()}
            ${
                errorMessage
                    ? html` <div class=${classMap({ progress: true, error: !!errorMessage })}>${errorMessage}</div> `
                    : nothing
            }
            ${
                message
                    ? html`
                          <div class="progress">
                              <ol start=${step}>
                                  <li>${message}</li>
                              </ol>
                          </div>
                      `
                    : nothing
            }
            ${
                active
                    ? html`
                          <div class="progress">
                              <md-linear-progress
                                  ?indeterminate=${count === undefined}
                                  value=${step / (count || step)}
                              ></md-linear-progress>
                          </div>
                      `
                    : nothing
            }
            <div class="bottom-bar">
                <md-filled-tonal-button @click=${this.#save} ?disabled=${active}>
                    <md-icon slot="icon">save</md-icon>
                    Zapisz
                </md-filled-tonal-button>
                <md-text-button @click=${() => chrome.runtime.openOptionsPage()}>
                    <md-icon slot="icon">settings</md-icon>
                    Ustawienia
                </md-text-button>
                <md-icon-button @click=${() => window.location.reload()}>
                    <md-icon>refresh</md-icon>
                </<md-icon-button>
            </div>
            <identifier-editor-dialog></identifier-editor-dialog>
        `;
    }
}
