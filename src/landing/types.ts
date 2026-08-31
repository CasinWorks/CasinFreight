export interface StorySlide {
  id: string;
  stepNumber: number;
  title: string;
  tagline: string;
  explanation: string;
  simpleTip: string;
  image: string;
  iconName: string;
  phoneScreenType: 'dispatch' | 'weight' | 'driver_sign' | 'bir_invoice';
}

export type TextScale = 'normal' | 'large';
export type LanguageMode = 'en' | 'taglish';

export interface TripDemoState {
  truckType: string;
  plateNumber: string;
  driverName: string;
  destination: string;
  cargoWeightKg: number;
  maxGvwrKg: number;
  deliveryFee: number;
  clientName: string;
  isSigned: boolean;
  signerName: string;
  invoiceGenerated: boolean;
}
