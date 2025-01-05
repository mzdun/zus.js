import { DatedMinimal, Insured, LocalStorageData, minimalFor } from '../utils/storage';

import { ReportTemplate, TIME_RATIO } from './model';
import { calcPart, positive, roundAt100ths, roundAt1s } from './utils';

export function createRCAReport(
    insured: Insured,
    data: LocalStorageData,
    key: [string, string],
    month: number,
    year: number,
    minimal: DatedMinimal[],
) {
    const [dzielnik = 1, dzielna = 1] = insured.ratio ?? [];
    const salary = insured.salary ?? minimalFor(month, year, data, minimal);
    const podstawa = roundAt100ths((salary * dzielnik) / dzielna);

    const kwota_obnizajaca_podatek = roundAt100ths((data.tax_free_allowance * data.tax_rate) / 100 / 12);

    const ubezpieczenie_chorobowe = calcPart(podstawa, data.medical_insurance);
    const ubezpieczenie_emerytalne = calcPart(podstawa, data.pension_insurance);
    const ubezpieczenie_rentowe = calcPart(podstawa, data.disability_insurance);
    const ubezpieczenie_wypadkowe = calcPart(podstawa, data.accident_insurance);
    const fgsp = calcPart(podstawa, data.guaranteed_employee_benefits_fund);

    const skladki =
        ubezpieczenie_chorobowe.ubezpieczony +
        ubezpieczenie_emerytalne.ubezpieczony +
        ubezpieczenie_rentowe.ubezpieczony;

    const podstawa_na_zdrowotne = roundAt1s(positive(podstawa - (skladki + data.cost_of_obtaining)));
    const zaliczka = roundAt100ths((podstawa_na_zdrowotne * data.tax_rate) / 100);
    const podatek = positive(zaliczka - data.free_amount);

    const health_lowered = positive(zaliczka - kwota_obnizajaca_podatek);
    const skladka_zdrowotna_intermediate = roundAt100ths((positive(podstawa - skladki) * data.health) / 100);

    const skladka_zdrowotna =
        skladka_zdrowotna_intermediate < health_lowered ? skladka_zdrowotna_intermediate : health_lowered;

    const koszt = {
        ubezpieczonego: roundAt100ths(skladki + podatek + skladka_zdrowotna),
        platnika: roundAt100ths(
            ubezpieczenie_chorobowe.platnik_skladek +
                ubezpieczenie_emerytalne.platnik_skladek +
                ubezpieczenie_rentowe.platnik_skladek +
                ubezpieczenie_wypadkowe.platnik_skladek +
                fgsp.platnik_skladek,
        ),
    };

    const skladka_spoleczna = skladki + koszt.platnika;

    const pensja = {
        brutto: podstawa,
        netto: positive(podstawa - koszt.ubezpieczonego),
        brutto_platnika: podstawa + koszt.platnika,
    };

    const { name: imie, familyName: nazwisko, pesel } = insured;

    const result = {
        key,
        imie,
        nazwisko,
        pesel,
        wymiar_czasu_pracy: { dzielnik, dzielna },
        pensja,
        podstawa,
        kwota_obnizajaca_podatek,
        ubezpieczenie_chorobowe,
        ubezpieczenie_emerytalne,
        ubezpieczenie_rentowe,
        ubezpieczenie_wypadkowe,
        fgsp,
        skladki,
        podstawa_na_zdrowotne,
        zaliczka,
        podatek,
        skladka_spoleczna,
        skladka_zdrowotna,
        koszt,
    };
    return result;
}

export type RCAReport = ReturnType<typeof createRCAReport>;

export const RCA_TEMPLATE: ReportTemplate[] = [
    { id: 'I', fields: { 1: '$key' } },
    {
        id: 'III.A',
        fields: {
            1: '$nazwisko',
            2: '$imie',
            3: 'P',
            4: '$pesel',
        },
    },
    {
        id: 'III.B',
        fields: {
            1: ['0110', '0', '0'],
            3: {
                ref: ['$wymiar_czasu_pracy.dzielnik', '$wymiar_czasu_pracy.dzielna'],
                format: TIME_RATIO,
            },
            //
            4: '$pensja.brutto',
            5: '$pensja.brutto',
            6: '$pensja.brutto',
            //
            7: '$ubezpieczenie_emerytalne.ubezpieczony',
            8: '$ubezpieczenie_rentowe.ubezpieczony',
            9: '$ubezpieczenie_chorobowe.ubezpieczony',
            10: '$ubezpieczenie_wypadkowe.ubezpieczony',
            //
            11: '$ubezpieczenie_emerytalne.platnik_skladek',
            12: '$ubezpieczenie_rentowe.platnik_skladek',
            13: '$ubezpieczenie_chorobowe.platnik_skladek',
            14: '$ubezpieczenie_wypadkowe.platnik_skladek',
            //
            29: { ref: '$skladka_spoleczna', hidden: true },
        },
    },
    { id: 'III.C', fields: { 1: '$podstawa_na_zdrowotne', 4: '$skladka_zdrowotna' } },
];
