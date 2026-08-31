import { StorySlide } from '../types';
import heroOwner from '../assets/images/fleet_owner_hero_1788145018957.jpg';
import driverEpod from '../assets/images/driver_mobile_epod_1788145034837.jpg';
import weighbridge from '../assets/images/weighbridge_payload_1788145051720.jpg';
import birOffice from '../assets/images/bir_invoicing_office_1788145064325.jpg';

export const IMAGES = {
  heroOwner,
  driverEpod,
  weighbridge,
  birOffice,
};

export const STORY_SLIDES: StorySlide[] = [
  {
    id: 'step-1',
    stepNumber: 1,
    title: 'Assign Trips in 2 Clicks',
    tagline: 'No messy paper notebooks or confusing software.',
    explanation:
      'Select your truck plate and driver from a simple dropdown list. The system automatically computes the safe route and informs your driver on their phone.',
    simpleTip: '💡 Tip for owners: Your dispatch team can set up 10 trips in under 3 minutes.',
    image: IMAGES.heroOwner,
    iconName: 'Truck',
    phoneScreenType: 'dispatch',
  },
  {
    id: 'step-2',
    stepNumber: 2,
    title: 'Anti-Overload DPWH Weight Check',
    tagline: 'Avoid ₱20,000+ highway penalties automatically.',
    explanation:
      'Before your truck rolls out, CasinFreight checks your total cargo + tare weight against Philippine DPWH & NLEX maximum GVWR limits. Green means safe to go!',
    simpleTip: '💡 Tip for owners: Prevents impounding and protects your truck chassis from heavy wear.',
    image: IMAGES.weighbridge,
    iconName: 'Scale',
    phoneScreenType: 'weight',
  },
  {
    id: 'step-3',
    stepNumber: 3,
    title: 'Customer Signs on Driver’s Phone',
    tagline: 'Electronic Proof of Delivery (e-POD) with photos and seal checks.',
    explanation:
      'When your driver delivers the cargo, the warehouse client inspects the seal, takes a photo, and signs directly on the phone screen with their finger.',
    simpleTip: '💡 Tip for owners: No lost paper delivery receipts. You get notified in Manila the second it is signed in Cebu or Davao.',
    image: IMAGES.driverEpod,
    iconName: 'FileCheck2',
    phoneScreenType: 'driver_sign',
  },
  {
    id: 'step-4',
    stepNumber: 4,
    title: 'VAT + EWT auto-calculator',
    tagline: 'Get paid faster with VAT and EWT already computed on the bill.',
    explanation:
      'The moment e-POD is signed, CasinFreight computes 12% VAT and 2% EWT on the freight bill so your bookkeeper can review it. Print or WhatsApp in 1 click. This is an aid for your accountant — not a BIR-registered Sales Invoice or Official Receipt.',
    simpleTip: '💡 Tip for owners: Ready for your accountant. Attach the client’s Form 2307 when they pay. CasinFreight does not file with BIR.',
    image: IMAGES.birOffice,
    iconName: 'Receipt',
    phoneScreenType: 'bir_invoice',
  },
];

export const TRUCK_PRESETS = [
  { name: '6-Wheeler Forward Box', tareKg: 4500, maxGvwrKg: 14000, maxPayloadKg: 9500, icon: '🚚' },
  { name: '10-Wheeler Wingvan', tareKg: 9800, maxGvwrKg: 28000, maxPayloadKg: 18200, icon: '🚛' },
  { name: 'Tractor Head Semi-Trailer (18-Wheeler)', tareKg: 14500, maxGvwrKg: 41000, maxPayloadKg: 26500, icon: '🚜' },
  { name: '4-Wheeler Dropside L300', tareKg: 1800, maxGvwrKg: 3800, maxPayloadKg: 2000, icon: '🚐' },
];

export const FAQS = [
  {
    q: 'I am not very good with computers and smartphones. Can I still use this?',
    a: 'Absolutely YES! CasinFreight was built specifically for traditional Filipino fleet operators. The buttons are large, text is big and clear, and there are zero confusing technical menus. If you know how to use Facebook or send a text message, you can manage your fleet in 5 minutes.',
  },
  {
    q: 'Do my truck drivers need expensive high-tech phones?',
    a: 'No! The driver app runs smoothly on any affordable Android phone (even basic ₱3,000 smartphones from Cherry Mobile, Samsung, or Xiaomi). It uses very low internet data and even works offline when signal is weak in the provinces.',
  },
  {
    q: 'How does the 1-Month Free Trial work?',
    a: 'You get full access to manage up to 5 trucks and 10 trips for a whole 30 days. No credit card is needed to start. If you love it, you can continue on our Founding Member rate of only ₱899/month for your first year.',
  },
  {
    q: 'How does this help my company avoid DPWH Overload Fines?',
    a: 'Philippine Republic Act 8794 sets strict Maximum Gross Vehicle Weight (GVWR) per axle. Our system automatically checks your cargo weight against the legal limit for your truck configuration before it leaves the yard, giving you a green “Safe” or red “Overweight” warning.',
  },
  {
    q: 'Can my bookkeeper and accountant export to Excel?',
    a: 'Yes. Trip records, fuel expenses, 12% VAT, and 2% EWT summaries can be downloaded to Excel (.xlsx) or printed as a billing summary for your accountant. CasinFreight does not register, transmit, or certify invoices with BIR. This is not a Sales Invoice, Official Receipt, or CAS/PTU e-invoice.',
  },
  {
    q: 'What if I need help or have questions while using the app?',
    a: 'We provide dedicated phone and Viber support based in Metro Manila. You can call or chat with a real logistics specialist Monday to Saturday, 7:00 AM to 8:00 PM.',
  },
];
