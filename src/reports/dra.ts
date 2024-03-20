import { LocalStorageData } from '../utils/storage';

import { percentTemplate, ReportTemplate } from './model';
import { RCAReport } from './rca';
import { Contribution, reducePart } from './utils';

const INIT_CONTRIBUTION: Contribution = {
    platnik_skladek: 0,
    ubezpieczony: 0,
};

export function createDRAReport(rcaReports: RCAReport[], data: LocalStorageData, key: [string, string]) {
    const {
        ubezpieczenie_chorobowe,
        ubezpieczenie_emerytalne,
        ubezpieczenie_rentowe,
        ubezpieczenie_wypadkowe,
        skladka_spoleczna,
        skladka_zdrowotna,
    } = rcaReports.reduce(
        (
            current,
            {
                ubezpieczenie_chorobowe,
                ubezpieczenie_emerytalne,
                ubezpieczenie_rentowe,
                ubezpieczenie_wypadkowe,
                skladka_spoleczna,
                skladka_zdrowotna,
            },
        ) => {
            current.ubezpieczenie_chorobowe = reducePart(current.ubezpieczenie_chorobowe, ubezpieczenie_chorobowe);
            current.ubezpieczenie_emerytalne = reducePart(current.ubezpieczenie_emerytalne, ubezpieczenie_emerytalne);
            current.ubezpieczenie_rentowe = reducePart(current.ubezpieczenie_rentowe, ubezpieczenie_rentowe);
            current.ubezpieczenie_wypadkowe = reducePart(current.ubezpieczenie_wypadkowe, ubezpieczenie_wypadkowe);
            current.skladka_spoleczna = current.skladka_spoleczna + skladka_spoleczna;
            current.skladka_zdrowotna = current.skladka_zdrowotna + skladka_zdrowotna;
            return current;
        },
        {
            ubezpieczenie_chorobowe: INIT_CONTRIBUTION,
            ubezpieczenie_emerytalne: INIT_CONTRIBUTION,
            ubezpieczenie_rentowe: INIT_CONTRIBUTION,
            ubezpieczenie_wypadkowe: INIT_CONTRIBUTION,
            skladka_spoleczna: 0,
            skladka_zdrowotna: 0,
        },
    );

    return {
        key,
        liczba_ubezpieczonych: `${rcaReports.length}`,
        skladka_ubezpieczenia_wypadkowego: data.accident_insurance.total,
        ubezpieczenie_chorobowe,
        ubezpieczenie_emerytalne,
        ubezpieczenie_rentowe,
        ubezpieczenie_wypadkowe,
        skladka_spoleczna,
        skladka_zdrowotna,
    };
}

export type DRAReport = ReturnType<typeof createDRAReport>;

export const DRA_TEMPLATE: ReportTemplate[] = [
    { id: 'I', fields: { 1: '6', 2: '$key' } },
    {
        id: 'III',
        fields: { 1: '$liczba_ubezpieczonych', 3: percentTemplate('$skladka_ubezpieczenia_wypadkowego') },
    },
    {
        id: 'IV',
        fields: {
            4: '$ubezpieczenie_emerytalne.ubezpieczony',
            5: '$ubezpieczenie_rentowe.ubezpieczony',
            7: '$ubezpieczenie_emerytalne.platnik_skladek',
            8: '$ubezpieczenie_rentowe.platnik_skladek',
            //
            22: '$ubezpieczenie_chorobowe.ubezpieczony',
            23: '$ubezpieczenie_wypadkowe.ubezpieczony',
            25: '$ubezpieczenie_chorobowe.platnik_skladek',
            26: '$ubezpieczenie_wypadkowe.platnik_skladek',

            // READONLY
            1: '$+4,7,10,13,16',
            2: '$+5,8,11,14,17',
            3: '$+1,2',
            6: '$+4,5',
            9: '$+7,8',
            12: '$+10,11',
            15: '$+13,14',
            18: '$+16,17',
            //
            19: '$+22,25,28,31,34',
            20: '$+23,26,29,32,35',
            21: '$+19,20',
            24: '$+22,23',
            27: '$+25,26',
            30: '$+28,29',
            33: '$+31,32',
            36: '$+34,35',
            //
            37: '$+6,9,24,27',
        },
    },
    { id: 'VI', fields: { 2: '$skladka_zdrowotna' } },
    { id: 'IX', fields: { 2: '$skladka_spoleczna' } },
];
