export function lastMonthEx() {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return { month, year };
}

export function formatLastMonth(month: number, year: number) {
    return `${`${month}`.padStart(2, '0')}-${`${year}`.padStart(4, '0')}`;
}

export function lastMonth() {
    const { month, year } = lastMonthEx();
    return formatLastMonth(month, year);
}

export type Ratio = [number, number];
export interface Insured {
    name: string;
    familyName: string;
    pesel: string;
    salary?: number;
    ratio?: Ratio;
}

export interface Rate {
    total: number;
    insured?: number;
}

export interface LocalStorageData {
    insured: Insured[];
    minimal: number;
    cost_of_obtaining: number;
    tax_free_allowance: number;
    free_amount: number;
    tax_rate: number;
    health: number;
    pension_insurance: Rate;
    disability_insurance: Rate;
    medical_insurance: Rate;
    accident_insurance: Rate;
    guaranteed_employee_benefits_fund: Rate;
}

export interface SessionStorageData {
    serial: number;
    month: number;
    year: number;
    useLastMonth: boolean;
}

export const defaultLocalStorage: LocalStorageData = {
    insured: [],
    minimal: 0,
    cost_of_obtaining: 250,
    tax_free_allowance: 30_000,
    free_amount: 450,
    tax_rate: 12,
    health: 9,
    pension_insurance: { total: 19.52, insured: 9.76 },
    disability_insurance: { total: 8, insured: 1.5 },
    medical_insurance: { total: 2.45, insured: 2.45 },
    accident_insurance: { total: 1.67 },
    guaranteed_employee_benefits_fund: { total: 0 },
};

const { month, year } = lastMonthEx();
export const defaultSessionStorage: SessionStorageData = { serial: 1, month, year, useLastMonth: true };

export class StorageArea<StorageDataType extends LocalStorageData | SessionStorageData> {
    constructor(private readonly area: chrome.storage.StorageArea) {}
    get(): Promise<StorageDataType> {
        return new Promise((resolve, reject) => {
            this.area.get(null, (result) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }

                return resolve(result as StorageDataType);
            });
        });
    }

    set(data: StorageDataType): Promise<void> {
        return new Promise((resolve, reject) => {
            this.area.set(data as unknown as {[x: string]: unknown}, () => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }

                return resolve();
            });
        });
    }

    getItem<Key extends keyof StorageDataType>(key: Key): Promise<StorageDataType[Key]> {
        return new Promise((resolve, reject) => {
            this.area.get([key], (result) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }

                return resolve((result as StorageDataType)[key]);
            });
        });
    }

    setItem<Key extends keyof StorageDataType>(key: Key, value: StorageDataType[Key]): Promise<void> {
        return new Promise((resolve, reject) => {
            this.area.set({ [key]: value }, () => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }

                return resolve();
            });
        });
    }

    async initializeWithDefaults(defaults: StorageDataType) {
        const currentStorageData = await this.get();
        const newStorageData = Object.assign({}, defaults, currentStorageData);
        await this.set(newStorageData);
    }
}

export const storage = {
    local: new StorageArea<LocalStorageData>(chrome.storage.local),
    session: new StorageArea<SessionStorageData>(chrome.storage.session),
};

export interface DatedMinimal {
    year: number;
    month: number;
    amount: number;
}

export interface ExtensionConfig {
    minimal?: DatedMinimal[];
};

export type ChromeManifest = chrome.runtime.ManifestV3 & {
    x_zus_config?: ExtensionConfig;
};

export function minimalFor(month: number, year: number, data: LocalStorageData) {
    if (data.minimal > 0) {
        return data.minimal;
    }

    let result: DatedMinimal | undefined;
    let resultTag = 0;
    const tag = year * 100 + month;

    const manifest = chrome.runtime.getManifest() as ChromeManifest;
    const { minimal = [] } = manifest.x_zus_config ?? {};
    
    for (const dated of minimal) {
        const datedTag = dated.year * 100 + dated.month;
        if (datedTag > tag) {
            continue;
        }
        if (datedTag < resultTag) {
            continue;
        }
        resultTag = datedTag;
        result = dated;
    }

    return result?.amount ?? 0;
}

export function minimalForLastMonth(data: LocalStorageData) {
    const { month, year } = lastMonthEx();
    return minimalFor(month, year, data);
}

export function minimalForSession(session: SessionStorageData, data: LocalStorageData) {
    const { month, year } = session;
    return minimalFor(month, year, data);
}
