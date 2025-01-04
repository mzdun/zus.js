import '@material/web/button/filled-tonal-button.js';
import '@material/web/button/text-button.js';
import '@material/web/dialog/dialog.js';
import '@material/web/elevation/elevation.js';
import '@material/web/fab/fab.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/list/list-item.js';
import '@material/web/list/list.js';
import '@material/web/textfield/filled-text-field.js';
import '../simple-card/simple-card';
import '../snack-bar/snack-bar';
import '../insured-editor-dialog/insured-editor-dialog';
import '../properties-editor-dialog/properties-editor-dialog';
//
import '@material/web/button/outlined-button.js';

import { MdDialog } from '@material/web/dialog/dialog.js';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

import { LocalStorageController } from '../../controllers/storage-controller';
import { Insured, minimalFor } from '../../utils/storage';
import {
    InsuredEditorDialog,
    InsuredEditorOperation,
    InsuredEvent,
    RemoveInsuredEvent,
    ValidationErrorsEvent,
} from '../insured-editor-dialog/insured-editor-dialog';
import { PropertiesEditorDialog } from '../properties-editor-dialog/properties-editor-dialog';
import { SnackBarElement } from '../snack-bar/snack-bar';
import { employeeItem, onCancel, renderParameters } from '../ui';

import styles from './options-page.scss';

function renderConfirmation(host: HTMLElement, onClosed?: () => unknown) {
    return html`
        <md-dialog
            id="remove-confirmation"
            style="max-width: 400px;"
            @closed=${onClosed}
            @cancel=${onCancel(host, '#remove-confirmation')}
        >
            <div slot="headline">Usuwanie ubezpieczonego</div>
            <md-icon slot="icon">delete_outline</md-icon>
            <form id="confirm-form" slot="content" method="dialog">
                Czy na pewno chcesz trwale usunąć ubezpieczonego z listy raportów ZUS RCA?
            </form>
            <div slot="actions">
                <md-text-button form="confirm-form" value="delete"> Usuń </md-text-button>
                <md-filled-tonal-button form="confirm-form" value="cancel" autofocus> Anuluj </md-filled-tonal-button>
            </div>
        </md-dialog>
    `;
}

@customElement('options-page')
export class OptionsPageElement extends LitElement {
    static styles = styles;

    #controller = new LocalStorageController(this);
    #removedPesel?: string;

    @property({ type: String }) accessor size: 'large' | 'medium' | 'small' = 'medium';

    @query('insured-editor-dialog')
    accessor employeeEditor: InsuredEditorDialog | undefined = undefined;
    @query('properties-editor-dialog')
    accessor propertiesEditor: PropertiesEditorDialog | undefined = undefined;
    @query('#remove-confirmation')
    accessor removeConfirmation: MdDialog | undefined = undefined;
    @query('#snackbar') accessor snackbar: SnackBarElement | undefined = undefined;

    #addInsured = async () => {
        this.employeeEditor?.show(undefined);
    };

    #editInsured = async (insured: Insured) => {
        this.employeeEditor?.show(insured);
    };

    #editProperties = async () => {
        this.propertiesEditor?.show(this.#controller.data);
    };

    #error = (msg: string) => {
        console.error(msg);
        this.snackbar?.push(msg);
    };

    #onRemove = ({ pesel }: RemoveInsuredEvent) => {
        this.#removedPesel = pesel;
        this.removeConfirmation?.show();
    };
    #onConfirmedRemove = async () => {
        await this.#controller.removeInsured(this.#removedPesel ?? '');
    };
    #onStore = async ({ key, insured, op }: InsuredEvent) => {
        try {
            if (op === InsuredEditorOperation.ADD) {
                await this.#controller.addInsured(insured);
            } else {
                await this.#controller.updateInsured(key, insured);
            }
        } catch (e) {
            this.#error(`${e}`);
        }
    };
    #onInvalid = ({ errors }: ValidationErrorsEvent) => errors.map(this.#error);

    render() {
        const { version } = chrome.runtime.getManifest();
        const containerClass = `container size-${this.size}`;

        const { insured } = this.#controller.data;
        const { month, year } = this.#controller.date;
        const minimal = minimalFor(month, year, this.#controller.data);

        return html`
    <div class=${containerClass}>
        <h1 class="text-headline title">
            <img src="/icons/zus.svg" />
            <span>Raporty <b>ZUS DRA/RCA</b> <small>(${version})</small></span>
        </h1>
        <simple-card heading="Ubezpieczeni">
          <md-list>
            ${
                (insured ?? []).length > 0
                    ? nothing
                    : html`
                          <md-list-item type="button" @click=${this.#addInsured}>
                              Lista jest pusta
                              <div slot="supporting-text">Kliknij tutaj, żeby dodać pierwszego ubezpieczonego</div>
                          </md-list-item>
                      `
            }
            ${[...(insured ?? [])].map(employeeItem(minimal, this.#editInsured))}
          </md-list>
          <div class="icon-parent" slot="relative">
            <md-icon-button
              aria-label="Dodaj ubezpieczonego"
              @click=${this.#addInsured}>
              <md-icon>person_add</md-icon>
            </md-icon-button>
          </div>
          <insured-editor-dialog
            @remove=${this.#onRemove}
            @store=${this.#onStore}
            @invalid=${this.#onInvalid}
          ></insured-editor-dialog>
        </simple-card>

        <simple-card heading="Parametry">
          <div class="icon-parent" slot="relative">
            <md-icon-button
              aria-label="Edytuj parametry"
              @click=${this.#editProperties}>
              <md-icon>edit</md-icon>
            </md-icon-button>
          </div>
          ${renderParameters(this.#controller.data, month, year)}
          <properties-editor-dialog
            @invalid=${this.#onInvalid}
          ></properties-editor-dialog>
        </simple-card>

        ${renderConfirmation(this, this.#onConfirmedRemove)}
        <snack-bar id='snackbar'></snack-bar>
    </div>
    `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'options-page': OptionsPageElement;
    }
}
