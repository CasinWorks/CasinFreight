import type { TruckType } from '../types';

/** Expected kilometers per liter for a truck body type. Used to flag a thirsty fill-up. */
export function getTargetKmPerLiter(type: TruckType): number {
  switch (type) {
    case '4-Wheeler Closed Van': return 7.0;
    case '6-Wheeler Closed Van': return 5.5;
    case '6-Wheeler Dropside/Wingvan': return 5.0;
    case '10-Wheeler Wingvan': return 3.2;
    case '10-Wheeler Dump Truck': return 2.8;
    case '20ft Container Chassis': return 3.0;
    case '40ft Container Chassis': return 2.5;
    case 'Tractor Head / 14-Wheeler': return 2.4;
    default: return 3.5;
  }
}
