// Generated from CommandGlows tokens 1.3.0 (ba534285a3103a37a1e5d6e6fbbb4f2b3d4e95c198de0c03f7f0b34a5dca7edc); do not edit.
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
