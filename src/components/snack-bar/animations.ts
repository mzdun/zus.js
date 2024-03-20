export type AnimationArgs = Parameters<Element['animate']>;

export interface SnackbarAnimation {
    snackbar?: AnimationArgs[];
    container?: AnimationArgs[];
    content?: AnimationArgs[];
}

export const EASING = {
    STANDARD: 'cubic-bezier(0.2, 0, 0, 1)',
    STANDARD_ACCELERATE: 'cubic-bezier(.3,0,1,1)',
    STANDARD_DECELERATE: 'cubic-bezier(0,0,0,1)',
    EMPHASIZED: 'cubic-bezier(.3,0,0,1)',
    EMPHASIZED_ACCELERATE: 'cubic-bezier(.3,0,.8,.15)',
    EMPHASIZED_DECELERATE: 'cubic-bezier(.05,.7,.1,1)',
} as const;

export const ANIMATION = {
    VISIBLE: 5000,
    MOVE: 500,
    MOVE_BY: '50px',
} as const;

export const SNACKBAR_DEFAULT_OPEN_ANIMATION: SnackbarAnimation = {
    snackbar: [
        [
            [{ transform: `translateY(${ANIMATION.MOVE_BY})` }, { transform: 'translateY(0)' }],
            { duration: ANIMATION.MOVE, easing: EASING.EMPHASIZED },
        ],
    ],
    container: [
        [[{ opacity: 0 }, { opacity: 1 }], { duration: ANIMATION.MOVE / 10, easing: 'linear' }],
        [[{ height: '35%' }, { height: '100%' }], { duration: ANIMATION.MOVE, easing: EASING.EMPHASIZED }],
    ],
    content: [
        [
            [{ opacity: 0 }, { opacity: 0, offset: 0.2 }, { opacity: 1 }],
            { duration: ANIMATION.MOVE / 2, easing: 'linear', fill: 'forwards' },
        ],
    ],
};

export const SNACKBAR_DEFAULT_CLOSE_ANIMATION: SnackbarAnimation = {
    snackbar: [
        [
            [{ transform: 'translateY(0)' }, { transform: `translateY(${ANIMATION.MOVE_BY})` }],
            { duration: ANIMATION.MOVE, easing: EASING.EMPHASIZED },
        ],
    ],
    container: [
        [
            [{ height: '100%' }, { height: '35%' }],
            { duration: (ANIMATION.MOVE * 3) / 10, easing: EASING.EMPHASIZED_ACCELERATE },
        ],
        [
            [{ opacity: '1' }, { opacity: '0' }],
            {
                delay: ANIMATION.MOVE / 5,
                duration: ANIMATION.MOVE / 10,
                easing: 'linear',
            },
        ],
    ],
    content: [[[{ opacity: 1 }, { opacity: 0 }], { duration: ANIMATION.MOVE / 5, easing: 'linear', fill: 'forwards' }]],
};
