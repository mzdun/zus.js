import { Rate } from '../utils/storage';

export function roundAt100ths(val: number) {
    return Math.round(val * 100) / 100;
}

export function roundAt1s(val: number) {
    return Math.round(val);
}

export interface Contribution {
    platnik_skladek: number;
    ubezpieczony: number;
}

export function calcPart(salary: number, { total, insured }: Rate): Contribution {
    if (insured === undefined)
        return {
            platnik_skladek: roundAt100ths((total * salary) / 100),
            ubezpieczony: 0,
        };
    const platnik_skladek = total - insured;
    return {
        platnik_skladek: roundAt100ths((platnik_skladek * salary) / 100),
        ubezpieczony: roundAt100ths((insured * salary) / 100),
    };
}

export function reducePart(a: Contribution, b: Contribution): Contribution {
    return {
        platnik_skladek: a.platnik_skladek + b.platnik_skladek,
        ubezpieczony: a.ubezpieczony + b.ubezpieczony,
    };
}

export const positive = (value: number) => (value < 0 ? 0 : value);
