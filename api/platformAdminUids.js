'use strict';

/**
 * Firebase Auth UIDs that may receive token.admin.
 * Never grant platform admin by email — an attacker who changes their
 * mailbox onto an allowlisted address would become admin.
 *
 * Add more without a code change: PLATFORM_ADMIN_UIDS=uid1,uid2 (Vercel env).
 * Copy the UID from Firebase Console → Authentication → Users.
 */
const BUILTIN_PLATFORM_ADMIN_UIDS = [
  // CasinFreight owner on project casinfreight.
];

function platformAdminUids() {
  const fromEnv = String(process.env.PLATFORM_ADMIN_UIDS || '')
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set([...BUILTIN_PLATFORM_ADMIN_UIDS, ...fromEnv])];
}

function isPlatformAdminUid(uid) {
  const id = String(uid || '').trim();
  return Boolean(id) && platformAdminUids().includes(id);
}

module.exports = {
  BUILTIN_PLATFORM_ADMIN_UIDS,
  platformAdminUids,
  isPlatformAdminUid,
};
