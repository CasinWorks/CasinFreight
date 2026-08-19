/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_PAYMONGO_CHECKOUT_URL?: string;
  readonly VITE_PAYMONGO_PAYMENT_LINK?: string;
  readonly VITE_PAYMONGO_USE_API?: string;
  readonly VITE_PAYMONGO_TEST_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
