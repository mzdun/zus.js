import '@material/web/dialog/dialog.js';
import '@material/web/textfield/filled-text-field.js';

import { MdDialog } from '@material/web/dialog/dialog.js';
import { html, LitElement, nothing } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';

import { Insured } from '../../utils/storage';
import { Input, onCancel, parseRatio } from '../ui';

import styles from './insured-editor-dialog.scss';

const addDialog = {
    title: 'Dodaj ubezpieczonego',
    ok: 'Dodaj',
};

const editDialog = {
    title: 'Edytuj ubezpieczonego',
    ok: 'Zapisz',
};

const FORM_INPUTS: Input[][] = [
    [
        { label: 'Imi\u0119', id: 'name', autofocus: true },
        { label: 'Nazwisko', id: 'family-name' },
    ],
    [
        { label: 'PESEL', id: 'pesel', pattern: '^\\d{11}$' },
        { label: 'Wymiar', id: 'time-ratio', pattern: '^\\d+/\\d+$' },
    ],
    [
        {
            label: 'Wynagrodzenie',
            id: 'salary',
            type: 'number',
            inputMode: 'decimal',
            step: '.01',
        },
    ],
];

export enum InsuredEditorOperation {
    ADD = 'add',
    UPDATE = 'update',
}

export class RemoveInsuredEvent extends Event {
    constructor(public readonly pesel: string) {
        super('remove');
    }
}

export class InsuredEvent extends Event {
    constructor(
        public readonly key: string,
        public readonly insured: Insured,
        public readonly op: InsuredEditorOperation,
    ) {
        super('store');
    }
}

export class ValidationErrorsEvent extends Event {
    constructor(public readonly errors: string[]) {
        super('invalid');
    }
}

@customElement('insured-editor-dialog')
export class InsuredEditorDialog extends LitElement {
    static styles = styles;

    @query('md-dialog') accessor dialog: MdDialog | undefined = undefined;
    @query('form') accessor form: HTMLFormElement | undefined = undefined;

    @state() accessor isEditing = false;
    @state() accessor key = '';
    @state() accessor name = '';
    @state() accessor familyName = '';
    @state() accessor pesel = '';
    @state() accessor timeRatio = '';
    @state() accessor salary = '';

    //    ###    ########  ####
    //   ## ##   ##     ##  ##
    //  ##   ##  ##     ##  ##
    // ##     ## ########   ##
    // ######### ##         ##
    // ##     ## ##         ##
    // ##     ## ##        ####

    async show(insured: Insured | undefined) {
        this.isEditing = insured !== undefined;
        this.form?.reset();

        if (insured) {
            const { name, familyName, pesel, ratio = [], salary } = insured;
            const [num = 1, den = 1] = ratio;
            const time = num === den ? '' : `${num}/${den}`;
            this.key = pesel ?? '';
            this.name = name ?? '';
            this.familyName = familyName ?? '';
            this.pesel = pesel ?? '';
            this.timeRatio = time;
            this.salary = salary !== undefined ? `${salary}` : '';
        } else {
            this.key = '';
            this.name = '';
            this.familyName = '';
            this.pesel = '';
            this.timeRatio = '';
            this.salary = '';
        }

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
        if (!['ok', 'remove'].includes(this.dialog?.returnValue ?? '')) return;

        if (this.dialog?.returnValue === 'remove') {
            this.dispatchEvent(new RemoveInsuredEvent(this.pesel));
            return;
        }

        try {
            const insured = await validateEditor(this);
            if (!insured) return;
            this.dispatchEvent(
                new InsuredEvent(
                    this.key,
                    insured,
                    this.isEditing ? InsuredEditorOperation.UPDATE : InsuredEditorOperation.ADD,
                ),
            );
        } catch (e) {
            if (!Array.isArray(e)) throw e;
            this.dispatchEvent(new ValidationErrorsEvent(e as string[]));
        }
    };

    // ########  ######## ##    ## ########  ######## ########
    // ##     ## ##       ###   ## ##     ## ##       ##     ##
    // ##     ## ##       ####  ## ##     ## ##       ##     ##
    // ########  ######   ## ## ## ##     ## ######   ########
    // ##   ##   ##       ##  #### ##     ## ##       ##   ##
    // ##    ##  ##       ##   ### ##     ## ##       ##    ##
    // ##     ## ######## ##    ## ########  ######## ##     ##

    #value(id: string) {
        const { name, familyName, pesel, timeRatio, salary } = this;
        const data: Record<string, string> = {
            name,
            'family-name': familyName,
            pesel,
            'time-ratio': timeRatio,
            salary,
        };
        return data[id] ?? '';
    }

    #renderInput({ label, id, type, inputMode, step, pattern, autofocus }: Input) {
        return html`
            <md-filled-text-field
                label=${label}
                name=${id}
                id=${id}
                type=${type ?? 'text'}
                inputmode=${inputMode ?? ''}
                step=${step ?? ''}
                pattern=${pattern ?? ''}
                ?autofocus=${autofocus}
                value=${this.#value(id)}
            ></md-filled-text-field>
        `;
    }

    #renderRow(inputs: Input[]) {
        if (inputs.length === 1) return this.#renderInput(inputs[0]);
        return html` <div class="row">${inputs.map((input) => this.#renderInput(input))}</div> `;
    }

    #renderForm(formInputs: Input[][] = FORM_INPUTS) {
        return html`
            <form slot="content" id="form" method="dialog" class="content">
                ${formInputs.map((row) => this.#renderRow(row))}
            </form>
        `;
    }

    override render() {
        const { isEditing } = this;
        const { title: dialogTitle, ok: okLabel } = isEditing ? editDialog : addDialog;

        const deleteButton = !isEditing
            ? nothing
            : html`
                  <md-text-button form="form" value="remove">
                      Usuń
                      <md-icon slot="icon">delete</md-icon>
                  </md-text-button>
              `;

        return html`
            <md-dialog @closed=${this.#onClosed} @cancel=${onCancel(this, 'md-dialog')}>
                <div slot="headline">${dialogTitle}</div>
                ${this.#renderForm()}
                <div slot="actions">
                    <md-text-button form="form" value="reset" type="reset"> Resetuj </md-text-button>
                    <div style="flex: 1"></div>
                    ${deleteButton}
                    <md-text-button form="form" value="cancel"> Anuluj </md-text-button>
                    <md-filled-tonal-button form="form" value="ok" type="submit"> ${okLabel} </md-filled-tonal-button>
                </div>
            </md-dialog>
        `;
    }
}

export async function validateEditor(host: HTMLElement) {
    const form = host.shadowRoot?.querySelector('form');
    if (!form) return null;

    const data: Record<string, string> = {};
    const errors: string[] = [];
    for (let index = 0; index < form.length; ++index) {
        const child = form[index] as HTMLInputElement;

        const name = child.name;
        if (name === '') continue;

        let value = child.value;

        if (['name', 'family-name'].includes(name)) {
            if (value === '') {
                errors.push(`Pole "${child.getAttribute('label') ?? name}" jest puste...`);
            } else {
                value = value.toLocaleUpperCase();
            }
        }

        if (name === 'pesel' && !value.match(/^\d{11}$/)) {
            errors.push('Pole "PESEL" nie sk\u0142ada si\u0119 z 11 cyfr...');
        }

        if (name === 'time-ratio' && value !== '' && !value.match(/^\d+\/\d+$/)) {
            errors.push('Pole "Wymiar" nie pasuje do szablonu N/M...');
        }

        data[name] = value;
    }

    if (errors.length > 0) throw errors;

    return <Insured>{
        name: data['name'],
        familyName: data['family-name'],
        pesel: data['pesel'],
        salary: data['salary'] ? parseFloat(data['salary']) : undefined,
        ratio: data['time-ratio'] ? parseRatio(data['time-ratio']) : undefined,
    };
}
