// Generated from CommandGlows tokens 1.3.0 (01c5488ea88f025cb518d04d7945e4ec7aa00da2bfcc2d6b41870fffa50c5f48); do not edit.
export interface EmailAdapterTokenSource {
  readonly "component.email.button.background": string;
  readonly "component.email.button.radius": Readonly<{ amount: number; unit: 'px' }>;
  readonly "semantic.space.unit": Readonly<{ amount: number; unit: 'px' }>;
  readonly "semantic.typography.email.body.family": readonly string[];
}

export const EMAIL_TOKENS = {
  "component.email.button.background": "#ff00c8",
  "component.email.button.radius": {
    "amount": 10,
    "unit": "px"
  },
  "semantic.space.unit": {
    "amount": 4,
    "unit": "px"
  },
  "semantic.typography.email.body.family": [
    "sans-serif"
  ]
} as const satisfies EmailAdapterTokenSource;

export const EMAIL_CLIENT_ADAPTATIONS = {
  "confirmationText": "#999999",
  "divider": "#e5e5e5",
  "foreground": "#000000",
  "maxContentWidth": 600,
  "mutedText": "#525252",
  "subtleText": "#737373",
  "surface": "#ffffff",
  "text": "#171717"
} as const;
