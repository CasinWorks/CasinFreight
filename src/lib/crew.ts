import type { Driver } from '../types';

export function isHelperCrew(person?: Pick<Driver, 'crewRole'> | null): boolean {
  return person?.crewRole === 'helper';
}

export function licensedDrivers(people: Driver[]): Driver[] {
  return people.filter((person) => !isHelperCrew(person));
}

export function helperCrew(people: Driver[]): Driver[] {
  return people.filter((person) => isHelperCrew(person));
}
