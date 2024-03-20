import { FieldTemplate, MONEY_FORMAT, ReportField, ReportFieldTemplate, ReportSection, ReportTemplate } from './model';
import { roundAt100ths } from './utils';

class Expr {
    constructor(public readonly refs: number[]) {}
}

class Ref {
    constructor(public readonly path: string[]) {}
}

type CompiledFieldTemplate = FieldTemplate<string | Ref | Expr>;

function compileSingleRef(ref: string) {
    if (!ref.startsWith('$')) return ref;
    if (ref.startsWith('$+'))
        return new Expr(
            ref
                .substring(2)
                .split(',')
                .map((num) => parseInt(num.trim())),
        );
    return new Ref(ref.substring(1).split('.'));
}

function hasExpr(ref: string) {
    return ref.startsWith('$+');
}

function compileRef(ref: ReportFieldTemplate): CompiledFieldTemplate {
    if (typeof ref === 'number') return { ref };
    if (typeof ref === 'string') return { ref: compileSingleRef(ref), hidden: hasExpr(ref) };
    if (Array.isArray(ref)) return { ref: ref.map(compileSingleRef), hidden: ref.some(hasExpr) };
    const { ref: newRef, hidden } = compileRef(ref.ref);
    return { ...ref, hidden, ref: newRef };
}

function compileRefSection(template: Record<number, ReportFieldTemplate>): Record<number, CompiledFieldTemplate> {
    return Object.fromEntries(Object.entries(template).map(([id, field]) => [id, compileRef(field)]));
}

function derefSingleExprRef<ReportType>(
    ctx: ReportType,
    cyclicGuard: number,
    ref: number,
    section: Record<number, CompiledFieldTemplate>,
) {
    const field = section[ref];
    if (field === undefined) return 0;
    if (field.ref instanceof Ref) {
        const value = derefRef(ctx, field.ref);
        if (typeof value === 'number') return value;
        return null;
    }
    if (field.ref instanceof Expr) return derefExpr(ctx, cyclicGuard, field.ref, section);
    if (typeof field.ref === 'number') return field.ref;
    return null;
}

function derefExpr<ReportType>(
    ctx: ReportType,
    cyclicGuard: number | null,
    ref: Expr,
    section: Record<number, CompiledFieldTemplate>,
): number | null {
    const values = ref.refs.map((refId) =>
        cyclicGuard === refId ? null : derefSingleExprRef(ctx, cyclicGuard ?? refId, refId, section),
    );
    if (values.some((val) => val === null)) return null;
    return roundAt100ths((values as number[]).reduce((prev, curr) => prev + curr));
}

function derefRef<ReportType>(ctx: ReportType, ref: Ref) {
    let stack = ctx as unknown as Record<string, unknown>;
    let value;
    for (const name of ref.path) {
        value = stack[name];
        if (value === undefined) {
            console.error(
                `Cannot find '${name}' in current context (when looking up '$${ref.path.join('.')}'). Context:`,
                stack,
                'Global:',
                ctx,
            );
            break;
        }
        stack = value as Record<string, unknown>;
    }
    if (value === undefined) value = null;
    if (typeof value === 'object' && !Array.isArray(value)) {
        console.error(`Reference '${ref}' points to a sub-context:`, value, 'Global:', ctx);
        value = null;
    }
    return value as null | string | number | string[];
}

function derefField<ReportType>(
    ctx: ReportType,
    ref: CompiledFieldTemplate['ref'],
    section: Record<number, CompiledFieldTemplate>,
): ReportField['value'] | null {
    if (ref instanceof Ref) return derefRef(ctx, ref);
    if (ref instanceof Expr) return derefExpr(ctx, null, ref, section);
    if (Array.isArray(ref)) {
        const values = ref.map((item) => derefField(ctx, item, section));
        if (values.includes(null)) return null;
        return values.map((item) => `${item}`);
    }
    return ref;
}

function derefFields<ReportType>(
    ctx: ReportType,
    id: number,
    template: CompiledFieldTemplate,
    section: Record<number, CompiledFieldTemplate>,
): [number, ReportField | null] {
    const value = derefField(ctx, template.ref, section);
    if (value === null) return [id, null];
    const { help, format: preselectFormat, hidden } = template;
    const guessedFormat = typeof value === 'number' ? MONEY_FORMAT : undefined;
    return [id, { id, value, help, format: preselectFormat ?? guessedFormat, hidden }];
}

function derefSection<ReportType>(ctx: ReportType, section: Record<number, CompiledFieldTemplate>): ReportField[] {
    const entries = Object.entries(section) as unknown as [number, CompiledFieldTemplate][];
    const mapped = entries.map(([id, field]) => derefFields(ctx, id, field, section)).filter((entry) => !!entry[1]) as [
        number,
        ReportField,
    ][];
    const keys = mapped.map(([key]) => key).sort((a, b) => a - b);
    const obj = Object.fromEntries(mapped);
    return keys.map((key) => obj[key]);
}

function fillReportSection<ReportType>(
    ctx: ReportType,
    id: string,
    section: Record<number, CompiledFieldTemplate>,
): ReportSection {
    return {
        id,
        fields: derefSection(ctx, section),
    };
}

export function fillReportSections<ReportType>(ctx: ReportType, template: ReportTemplate[]) {
    return template.map((section) => {
        const compiled = compileRefSection(section.fields);
        const data = fillReportSection(ctx, section.id, compiled);
        return data;
    });
}
