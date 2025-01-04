import { ReactiveController, ReactiveControllerHost } from 'lit';

import { createDRAReport, DRA_TEMPLATE, DRAReport } from '../reports/dra';
import { Report } from '../reports/model';
import { createRCAReport, RCA_TEMPLATE, RCAReport } from '../reports/rca';
import { fillReportSections } from '../reports/template';
import {
    Insured,
    LocalStorageData,
    SessionStorageData,
    defaultLocalStorage,
    defaultSessionStorage,
    formatLastMonth,
    lastMonth,
    lastMonthEx,
    storage,
} from '../utils/storage';

function packRCAReport(report: RCAReport, index: number | undefined): Report {
    const id = index === undefined ? 'rca' : `rca-${report.pesel}`;
    const title = index === undefined ? 'RCA' : `RCA #${index + 1}`;
    const sections = fillReportSections(report, RCA_TEMPLATE);
    return { id, title, type: 'ZUS RCA', sections };
}

export class LocalStorageController implements ReactiveController {
    host: ReactiveControllerHost;
    data: LocalStorageData = { ...defaultLocalStorage };
    date = lastMonthEx();
    reportsReady = false;
    rcaReports: RCAReport[] = [];
    draReport?: DRAReport;
    reportViews: Report[] = [];

    #identifier: [string, string] = ['01', lastMonth()];
    #timer = 0;

    constructor(host: ReactiveControllerHost) {
        this.host = host;
        this.host.addController(this);
        storage.local.get().then((data) => {
            this.data = { ...this.data, ...data };
            this.#startCalculatingReports();
            this.host.requestUpdate();
        });
    }

    get identifier() {
        return this.#identifier;
    }

    set identifier(value: [string, string]) {
        if (
            this.#identifier.length === value.length &&
            this.#identifier[0] === value[0] &&
            this.#identifier[1] === value[1]
        ) {
            return;
        }
        this.#identifier = value;
        const [month, year] = value[1].split('-').map((v) => parseInt(v, 10))
        this.date = {month, year};
        this.#startCalculatingReports();
        this.host.requestUpdate();
    }

    hostConnected() {
        chrome.storage.onChanged.addListener(this.#onStorageUpdate);
    }

    hostDisconnected() {
        chrome.storage.onChanged.removeListener(this.#onStorageUpdate);
    }

    async addInsured(insured: Insured) {
        const allInsured = this.data?.insured ?? [];
        const orig = allInsured.findIndex((existing) => insured.pesel === existing.pesel);
        if (orig > -1) {
            throw `Pesel ${insured.pesel} jest ju\u017c zarejestrowany`;
        }

        allInsured.push(insured);
        await storage.local.setItem('insured', allInsured);
        this.host.requestUpdate();
    }

    async updateInsured(pesel: string, insured: Insured) {
        const allInsured = this.data?.insured ?? [];
        const orig = allInsured.findIndex((existing) => pesel === existing.pesel);
        if (orig === -1) {
            throw `Brak '${insured.pesel}' na li\u015bcie zarejestrowanych numer\u00f3w pesel`;
        }

        allInsured[orig] = insured;
        await storage.local.setItem('insured', allInsured);
        this.host.requestUpdate();
    }

    async removeInsured(pesel: string) {
        const allInsured = this.data?.insured ?? [];
        const orig = allInsured.findIndex((existing) => pesel === existing.pesel);
        if (orig === -1) {
            throw `Brak '${pesel}' na li\u015bcie zarejestrowanych numer\u00f3w pesel`;
        }

        allInsured.splice(orig, 1);
        await storage.local.setItem('insured', allInsured);
    }

    #onStorageUpdate = (
        upstreamChanges: Record<string, chrome.storage.StorageChange>,
        areaName: chrome.storage.AreaName,
    ) => {
        if (areaName !== 'local') return;

        const changes = Object.fromEntries(
            Object.entries(upstreamChanges).map(([name, change]) => [name, change.newValue]),
        ) as Partial<LocalStorageData>;
        this.data = { ...this.data, ...changes };
        this.#startCalculatingReports();
        this.host.requestUpdate();
    };

    #calculateReports = () => {
        const key = this.identifier;
        const { insured } = this.data;
        const { month, year } = this.date;
        this.rcaReports = insured.map((insured) => createRCAReport(insured, this.data, key, month, year));
        this.draReport = createDRAReport(this.rcaReports, this.data, key);

        if (this.rcaReports.length === 1) {
            this.reportViews = [packRCAReport(this.rcaReports[0], undefined)];
        } else {
            this.reportViews = this.rcaReports.map(packRCAReport);
        }
        this.reportViews.push({
            id: 'dra',
            title: 'DRA',
            type: 'ZUS DRA',
            sections: fillReportSections(this.draReport, DRA_TEMPLATE),
        });

        this.reportsReady = true;
        this.host.requestUpdate();
    };

    #startCalculatingReports() {
        this.reportsReady = false;
        window.clearTimeout(this.#timer);
        this.#timer = window.setTimeout(this.#calculateReports, 10);
    }
}

export class SessionStorageController implements ReactiveController {
    host: ReactiveControllerHost;
    data: SessionStorageData = { ...defaultSessionStorage };

    get identifier(): [string, string] {
        const { month, year } = this.data.useLastMonth ? lastMonthEx() : this.data;
        return [`${this.data.serial}`.padStart(2, '0'), formatLastMonth(month, year)];
    }

    constructor(host: ReactiveControllerHost) {
        this.host = host;
        this.host.addController(this);
        storage.session.get().then((data) => {
            this.data = { ...this.data, ...data };
            this.host.requestUpdate();
        });
    }

    hostConnected() {
        chrome.storage.onChanged.addListener(this.#onStorageUpdate);
    }

    hostDisconnected() {
        chrome.storage.onChanged.removeListener(this.#onStorageUpdate);
    }

    setIdentifier(serial: number, month: number, year: number) {
        this.data = Object.assign({}, this.data, { serial, month, year, useLastMonth: false });
        storage.session.set(this.data);
        this.host.requestUpdate();
    }

    setSerial(serial: number) {
        this.data = Object.assign({}, this.data, { serial });
        storage.session.set(this.data);
        this.host.requestUpdate();
    }

    setUseLastMonth(useLastMonth: boolean) {
        this.data = Object.assign({}, this.data, { useLastMonth });
        storage.session.set(this.data);
        this.host.requestUpdate();
    }

    #onStorageUpdate = (
        upstreamChanges: Record<string, chrome.storage.StorageChange>,
        areaName: chrome.storage.AreaName,
    ) => {
        if (areaName !== 'session') return;

        const changes = Object.fromEntries(
            Object.entries(upstreamChanges).map(([name, change]) => [name, change.newValue]),
        ) as Partial<LocalStorageData>;
        this.data = { ...this.data, ...changes };
        this.host.requestUpdate();
    };
}
