import { fmt } from './labels';

export const tr = {
    suffix: {
        money: '\u00a0z\u0142',
        percent: '%',
    },
    label: {
        percent: fmt`<label> (%)`,

        minimal: 'Płaca minimalna',
        cost_of_obtaining: 'Koszty uzyskania',
        tax_free_allowance: 'Kwota wolna od podatku',
        free_amount: 'Kwota wolna',
        health: 'Zdrowotne',
        tax_rate: 'Stawka podatku',
        pension_insurance: 'Ubezpieczenie\u00a0emerytalne',
        disability_insurance: 'Ubezpieczenie\u00a0rentowe',
        medical_insurance: 'Ubezpieczenie\u00a0chorobowe',
        accident_insurance: 'Ubezpieczenie\u00a0wypadkowe',
        guaranteed_employee_benefits_fund: 'FGŚP',
    },
    salary: {
        label: 'Pensja',
        ratio: fmt`<ratio> z <full>`,
        label_unknown: 'Pensja nieznana',
        ratio_unknown: fmt`<ratio> minimalnej`,
    },
} as const;
