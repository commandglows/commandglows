export type Language = 'en' | 'fr';

export interface Translation {
  title?: string;
  meta?: {
    title?: string;
    description?: string;
    siteDescription?: string;
  };
  sections?: {
    [key: string]: {
      title?: string;
      description?: string;
      items?: string[];
      [key: string]: any;
    };
  };
  buttons?: {
    [key: string]: string;
  };
  messages?: {
    [key: string]: string;
  };
  forms?: {
    [key: string]: {
      title?: string;
      description?: string;
      fields?: {
        [key: string]: {
          label?: string;
          placeholder?: string;
          error?: string;
        };
      };
      buttons?: {
        [key: string]: string;
      };
      [key: string]: any;
    };
  };
  [key: string]: any;
}

export type Translations = {
  [key: string]: Translation;
};

export interface MetaTranslations {
  title: string;
  description: string;
} 