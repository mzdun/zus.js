import { tr } from '../utils/tr';

export enum Align {
    LEFT = 'left',
    RIGHT = 'right',
}

export interface FieldFormat {
    align: Align;
    prefix: string;
    infix: string;
    suffix: string;
    digits: number;
}

export const NUMBER_FORMAT = {
    align: Align.RIGHT,
    prefix: '',
    infix: '\u00a0',
    suffix: '',
    digits: 2,
};

export const STRING_FORMAT = {
    align: Align.LEFT,
    prefix: '',
    infix: '\u00a0',
    suffix: '',
    digits: -1,
};

export const MONEY_FORMAT = {
    ...NUMBER_FORMAT,
    suffix: tr.suffix.money,
};

export const PERCENT_FORMAT = {
    ...NUMBER_FORMAT,
    suffix: tr.suffix.percent,
};

export const RIGHT_ALIGNED_STRING = {
    ...STRING_FORMAT,
    align: Align.RIGHT,
};

export const TIME_RATIO = {
    ...RIGHT_ALIGNED_STRING,
    infix: '/',
};

export interface ReportField<StringType = string> {
    id: number;
    help?: string;
    value: StringType | number | StringType[];
    format?: FieldFormat;
    hidden?: boolean;
}

export interface ReportSection<StringType = string> {
    id: string;
    fields: ReportField<StringType>[];
}

export interface Report<StringType = string> {
    id: string;
    title: string;
    type: 'ZUS RCA' | 'ZUS DRA';
    sections: ReportSection<StringType>[];
}

export interface FieldTemplate<StringType = string> {
    help?: string;
    ref: StringType[] | StringType | number;
    format?: FieldFormat;
    hidden?: boolean;
}
export const fieldTemplate = (ref: string[] | string, format?: FieldFormat, help?: string) => ({ ref, format, help });

export const monetaryTemplate = (ref: string[] | string, help?: string) => fieldTemplate(ref, MONEY_FORMAT, help);

export const percentTemplate = (ref: string[] | string, help?: string) => fieldTemplate(ref, PERCENT_FORMAT, help);

export type ReportFieldTemplate<StringType = string> = FieldTemplate<StringType> | FieldTemplate<StringType>['ref'];

export interface ReportTemplate<StringType = string> {
    id: string;
    fields: Record<number, ReportFieldTemplate<StringType>>;
}
