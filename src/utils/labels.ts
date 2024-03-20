function split(raw: string) {
    const match = raw.match(/<([^>]+)>/);
    if (match === null) return [raw];
    const index = match.index ?? 0;
    const tok = match[1];
    const resume = index + match[0].length;
    return [raw.substring(0, index), tok, raw.substring(resume)];
}

export class TemplateResult {
    constructor(
        public readonly raw: (string | number)[],
        public readonly keys: string[],
    ) {}
    apply(data: Record<string, string | number | boolean>): string {
        return this.raw.map((item) => (typeof item === 'string' ? item : data[this.keys[item]] ?? '')).join('');
    }
}

export function fmt(tmplt: TemplateStringsArray): TemplateResult {
    let raw = tmplt.raw[0];
    const template = [];
    const keys: Record<string, number> = {};
    let ord = -1;
    while (raw !== undefined) {
        const result = split(raw);
        if (result.length === 1) {
            template.push(result[0]);
            break;
        }
        const [prefix, key, next] = result;
        if (keys[key] === undefined) {
            ord += 1;
            keys[key] = ord;
        }
        template.push(prefix, keys[key]);
        raw = next;
    }

    return new TemplateResult(
        template,
        Object.entries(keys)
            .sort((a, b) => a[1] - b[1])
            .map(([key]) => key),
    );
}
