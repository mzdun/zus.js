import { MdDialog } from '@material/web/dialog/dialog';
import { html, TemplateResult } from 'lit';

import { Insured, Ratio, LocalStorageData, minimalFor } from '../utils/storage';
import { tr } from '../utils/tr';

export interface Input {
    label: string;
    id: string;
    type?: 'number';
    inputMode?: 'decimal';
    step?: string;
    pattern?: string;
    autofocus?: boolean;
    min?: string;
    max?: string;
    chevron?: boolean;
}

export interface AmountAccessor {
    label: string;
    getter: 'cost_of_obtaining' | 'tax_free_allowance' | 'free_amount';
}

const HistoricalAmountGetters = ['minimal'] as const;
export interface HistoricalAmountAccessor {
    label: string;
    getter: (typeof HistoricalAmountGetters)[number];
}

const ScalarRateGetters = ['tax_rate', 'health'] as const;
export interface ScalarRateAccessor {
    label: string;
    getter: (typeof ScalarRateGetters)[number];
}

export interface RateAccessor {
    label: string;
    getter:
        | 'pension_insurance'
        | 'disability_insurance'
        | 'medical_insurance'
        | 'accident_insurance'
        | 'guaranteed_employee_benefits_fund';
}

export const HISTORICAL_AMOUNTS: HistoricalAmountAccessor[] = [
    { label: tr.label.minimal, getter: 'minimal' },
];

export const AMOUNTS: AmountAccessor[] = [
    { label: tr.label.cost_of_obtaining, getter: 'cost_of_obtaining' },
    { label: tr.label.tax_free_allowance, getter: 'tax_free_allowance' },
    { label: tr.label.free_amount, getter: 'free_amount' },
];

export const SCALAR_RATES: ScalarRateAccessor[] = [
    { label: tr.label.health, getter: 'health' },
    { label: tr.label.tax_rate, getter: 'tax_rate' },
];

export const RATES: RateAccessor[] = [
    { label: tr.label.pension_insurance, getter: 'pension_insurance' },
    { label: tr.label.disability_insurance, getter: 'disability_insurance' },
    { label: tr.label.medical_insurance, getter: 'medical_insurance' },
    { label: tr.label.accident_insurance, getter: 'accident_insurance' },
    { label: tr.label.guaranteed_employee_benefits_fund, getter: 'guaranteed_employee_benefits_fund' },
];

export function parseRatio(str: string) {
    return str.split('/', 2).map((val) => parseInt(val.trim())) as Ratio;
}

export function rounded(value: number, unit: string) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + unit;
}

export function roundedPLN(value: number) {
    return rounded(value, tr.suffix.money);
}
export function roundedPercent(value: number) {
    return rounded(value, tr.suffix.percent);
}

const FRACTIONS: Record<string, string> = {
    '1/4': '\u00bc',
    '1/2': '\u00bd',
    '3/4': '\u00be',
    '1/7': '\u2150',
    '1/9': '\u2151',
    '1/10': '\u2152',
    '1/3': '\u2153',
    '2/3': '\u2154',
    '1/5': '\u2155',
    '2/5': '\u2156',
    '3/5': '\u2157',
    '4/5': '\u2158',
    '1/6': '\u2159',
    '5/6': '\u215A',
    '1/8': '\u215B',
    '3/8': '\u215C',
    '5/8': '\u215D',
    '7/8': '\u215E',
} as const;

function calcGCD(a: number, b: number) {
    if (b) {
        return calcGCD(b, a % b);
    } else {
        return Math.abs(a);
    }
}

function ratioFrom(num: number, den: number) {
    const gcd = calcGCD(num, den);
    num /= gcd;
    den /= gcd;
    const ascii = `${num}/${den}`;
    return FRACTIONS[ascii] ?? ascii;
}

function salaryInfo(salary: number, ratio: Ratio | undefined) {
    const [ratioNum = 1, ratioDen = 1] = ratio ?? [];
    const simpleSalary = ratioNum === ratioDen;
    if (salary !== 0) {
        const full = roundedPLN(salary);
        const partial = roundedPLN((salary * ratioNum) / ratioDen);
        return simpleSalary
            ? html`<i>${tr.salary.label}</i>: ${full}`
            : html`<i>${tr.salary.label}</i>: ${partial}
                  (${tr.salary.ratio.apply({ ratio: ratioFrom(ratioNum, ratioDen), full })})`;
    }
    return simpleSalary
        ? html`<i>${tr.salary.label_unknown}</i>`
        : html`<i>${tr.salary.label_unknown}</i> (${tr.salary.ratio_unknown.apply({
                  ratio: ratioFrom(ratioNum, ratioDen),
              })})`;
}

export function employeeItem(minimal: number | undefined, click?: (e: Insured) => unknown) {
    return (insured: Insured) => {
        const { name, familyName, pesel, ratio, salary } = insured;
        return html`
            <md-list-item type="button" @click=${() => click?.(insured)}>
                ${familyName}, ${name} <small>(${pesel})</small>
                <div slot="supporting-text">${salaryInfo(salary ?? minimal ?? 0, ratio)}</div>
                <md-icon slot="start">person</md-icon>
            </md-list-item>
        `;
    };
}

function renderAmount(data: LocalStorageData, { label, getter }: AmountAccessor) {
    const value = data[getter] ?? 0;
    const trailingText = value ? roundedPLN(value) : html`<i>brak</i>`;
    return html`
        <md-list-item>
            <div slot="headline">${label}</div>
            <div slot="trailing-supporting-text">${trailingText}</div>
        </md-list-item>
    `;
}

const historicalLookup: Record<HistoricalAmountAccessor['getter'], (month: number, year: number, data: LocalStorageData) => number> = {
    "minimal": minimalFor
};

function historicalTrailingText(data: LocalStorageData, { getter }: HistoricalAmountAccessor, month: number, year: number) {
    const value = data[getter] ?? 0;
    if (value) {
        return roundedPLN(value);
    }

    const lookedUp = historicalLookup[getter](month, year, data);
    if (lookedUp) {
        return html`${roundedPLN(lookedUp)} <i><small>(${month}-${year})</small></i>`
    }

    return html`<i>brak</i>`
}

function renderHistoricalAmount(data: LocalStorageData, accessor: HistoricalAmountAccessor, month: number, year: number) {
    const trailingText = historicalTrailingText(data, accessor, month, year);
    return html`
        <md-list-item>
            <div slot="headline">${accessor.label}</div>
            <div slot="trailing-supporting-text">${trailingText}</div>
        </md-list-item>
    `;
}

function renderScalarRate(data: LocalStorageData, { label, getter }: ScalarRateAccessor) {
    const value = data[getter] ?? 0;
    const trailingText = value ? roundedPercent(value) : html`<i>brak</i>`;
    return html`
        <md-list-item>
            <div slot="headline">${label}</div>
            <div slot="trailing-supporting-text">${trailingText}</div>
        </md-list-item>
    `;
}

function isScalarRate(item: HistoricalAmountAccessor | AmountAccessor | ScalarRateAccessor): item is ScalarRateAccessor {
    return (ScalarRateGetters as readonly string[]).includes(item.getter);
}

function isHistoricalAmount(item: HistoricalAmountAccessor | AmountAccessor | ScalarRateAccessor): item is HistoricalAmountAccessor {
    return (HistoricalAmountGetters as readonly string[]).includes(item.getter);
}

function renderAmountOrScalarRate(data: LocalStorageData, item: HistoricalAmountAccessor | AmountAccessor | ScalarRateAccessor, month: number, year: number) {
    if (isScalarRate(item)) return renderScalarRate(data, item);
    if (isHistoricalAmount(item)) return renderHistoricalAmount(data, item, month, year);
    return renderAmount(data, item);
}

function renderRate(data: LocalStorageData, { label, getter }: RateAccessor) {
    const { total = 0, insured = 0 } = data[getter] ?? {};
    const employer = total - insured;
    const supportingText = `ubezpieczaj\u0105cy:\u00a0${roundedPercent(
        employer,
    )};\u00a0ubezpieczony:\u00a0${roundedPercent(insured)}`;
    const trailingText = total ? roundedPercent(total) : html`<i>brak</i>`;
    return html`
        <md-list-item>
            <div slot="headline">${label}</div>
            <div slot="supporting-text">${supportingText}</div>
            <div slot="trailing-supporting-text">${trailingText}</div>
        </md-list-item>
    `;
}

function renderParameterGroup<Accessor>(
    data: LocalStorageData,
    items: Accessor[],
    month: number,
    year: number,
    render: (data: LocalStorageData, item: Accessor, month: number, year: number) => TemplateResult<1>,
) {
    const mapper = (item: Accessor) => render(data, item, month, year);
    return html` <md-list class="parameters">${items.map(mapper)}</md-list> `;
}

export function renderParameters(data: LocalStorageData, month: number, year: number) {
    return html`
        <div class="parameter-container">
            ${renderParameterGroup(data, [...HISTORICAL_AMOUNTS, ...AMOUNTS, ...SCALAR_RATES], month, year, renderAmountOrScalarRate)}
            ${renderParameterGroup(data, RATES, month, year, renderRate)}
        </div>
    `;
}

export function onCancel(host: HTMLElement, selector: string) {
    return () => {
        const self = host.shadowRoot?.querySelector<MdDialog>(selector);
        if (self) self.returnValue = '';
    };
}
