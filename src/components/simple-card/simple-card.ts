import '@material/web/elevation/elevation.js';

import { html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import styles from './simple-card.scss';

@customElement('simple-card')
export class SimpleCardElement extends LitElement {
    static styles = styles;

    @property({ type: String }) accessor heading: string | undefined = undefined;
    @property({ type: String }) accessor subheading: string | undefined = undefined;

    render() {
        const { heading, subheading } = this;
        const headers =
            heading || subheading
                ? html`
                      <div class="headers">
                          ${heading ? html`<h1>${heading}</h1>` : nothing}
                          ${subheading ? html`<h2>${subheading}</h2>` : nothing}
                      </div>
                  `
                : nothing;
        return html`
            <div class="panel">
                <md-elevation></md-elevation>
                ${headers}
                <div class="content"><slot></slot></div>
                <div class="free-content">
                    <div class="relative"><slot name="relative"></slot></div>
                </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'simple-card': SimpleCardElement;
    }
}
