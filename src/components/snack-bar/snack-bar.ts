import '@material/web/elevation/elevation.js';

import { html, LitElement } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';

import {
    ANIMATION,
    AnimationArgs,
    SNACKBAR_DEFAULT_CLOSE_ANIMATION,
    SNACKBAR_DEFAULT_OPEN_ANIMATION,
    SnackbarAnimation,
} from './animations';
import styles from './snack-bar.scss';

function classNames(choose: Record<string, unknown>) {
    return Object.entries(choose)
        .filter((entry) => !!entry[1])
        .map(([className]) => className)
        .join(' ');
}

const { setTimeout } = window;

@customElement('snack-bar')
export class SnackBarElement extends LitElement {
    static styles = styles;

    @state() accessor messages: string[] = [];
    @state() accessor showMessage = false;
    @state() accessor timeout = 0;

    @query('.snackbar') private accessor snackbar!: HTMLDialogElement | null;
    @query('.container') private accessor container!: HTMLDialogElement | null;
    @query('.content') private accessor content!: HTMLDialogElement | null;

    #cancelAnimations?: AbortController;

    push(message: string) {
        this.messages.push(message);
        if (this.messages.length === 1) this.#showNext();
    }

    async #showNext() {
        this.showMessage = true;
        await this.updateComplete;
        await this.requestUpdate();
        this.timeout = setTimeout(this.#startHiding, ANIMATION.VISIBLE + ANIMATION.MOVE);

        this.#animate(SNACKBAR_DEFAULT_OPEN_ANIMATION);
    }

    #startHiding = async () => {
        this.#animate(SNACKBAR_DEFAULT_CLOSE_ANIMATION);
        this.timeout = setTimeout(this.#hide, ANIMATION.MOVE);
    };

    #hide = async () => {
        this.#animate(SNACKBAR_DEFAULT_CLOSE_ANIMATION);

        this.showMessage = false;
        if (this.messages.length > 0) {
            this.messages.splice(0, 1);
        }
        await this.updateComplete;
        await this.requestUpdate();
        this.timeout = setTimeout(this.#checkNext, ANIMATION.MOVE);
    };

    #checkNext = async () => {
        if (this.messages.length > 0 && !this.showMessage) {
            this.#showNext();
        }
    };

    async #animate(animation: SnackbarAnimation) {
        this.#cancelAnimations?.abort();
        this.#cancelAnimations = new AbortController();

        const { snackbar, container, content } = this;
        if (!snackbar || !container || !content) {
            return;
        }

        const { container: containerAnimate, snackbar: snackbarAnimate, content: contentAnimate } = animation;

        const elementAndAnimation: [Element, AnimationArgs[]][] = [
            [snackbar, snackbarAnimate ?? []],
            [container, containerAnimate ?? []],
            [content, contentAnimate ?? []],
        ];

        const animations: Animation[] = [];
        for (const [element, animation] of elementAndAnimation) {
            for (const animateArgs of animation) {
                const animation = element.animate(...animateArgs);
                this.#cancelAnimations.signal.addEventListener('abort', () => {
                    animation.cancel();
                });

                animations.push(animation);
            }
        }

        await Promise.all(
            animations.map((animation) =>
                animation.finished.catch(() => {
                    // Ignore intentional AbortErrors when calling
                    // `animation.cancel()`.
                }),
            ),
        );
    }

    render() {
        const msg = this.messages[0];
        const snackbarClasses = classNames({ snackbar: true, visible: msg !== undefined && this.showMessage });
        const containerClasses = classNames({ container: true, visible: msg !== undefined && this.showMessage });
        return html`
            <div class=${snackbarClasses}>
                <div class=${containerClasses}>
                    <md-elevation></md-elevation>
                    <div class="content">${msg ?? '\u00a0'}</div>
                </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'snack-bar': SnackBarElement;
    }
}
