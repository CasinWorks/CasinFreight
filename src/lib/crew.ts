import type { Driver } from '../types';
import type { RbacRole } from '../types/rbac';

export function isHelperCrew(person?: Pick<Driver, 'crewRole'> | null): boolean {
  return person?.crewRole === 'helper';
}

export function licensedDrivers(people: Driver[]): Driver[] {
  return people.filter((person) => !isHelperCrew(person));
}

export function helperCrew(people: Driver[]): Driver[] {
  return people.filter((person) => isHelperCrew(person));
}

/** RBAC roles that should auto-create / link a Drivers & Helpers roster row. */
export function isDriverSeatRole(roleIdOrName: string, roles: RbacRole[] = []): boolean {
  const raw = String(roleIdOrName || '').trim();
  if (!raw) return false;
  const n = raw.toLowerCase();
  if (n === 'driver') return true;
  if (n.includes('driver')) return true;
  if (n.includes('field') && (n.includes('operator') || n.includes('mobile'))) return true;

  const role = roles.find(
    (r) => r.id.toLowerCase() === n || r.name.toLowerCase() === n
  );
  if (!role) return false;
  const id = role.id.toLowerCase();
  const name = role.name.toLowerCase();
  if (id === 'driver' || id.includes('driver')) return true;
  if (name.includes('driver') || (name.includes('field') && name.includes('operator'))) return true;

  const perms = role.permissions || [];
  return (
    perms.includes('trips.status_delivered') &&
    perms.includes('fuel.log') &&
    !perms.includes('trips.create') &&
    !perms.includes('trips.edit')
  );
}
