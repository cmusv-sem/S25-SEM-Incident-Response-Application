/**
 * Roles Utility
 *
 * This file defines the roles available in the system.
 * Note: Keep this file in sync with client/src/utils/roles.ts
 */

/**
 * Enum representing the different user roles in the system
 */
export enum ROLES {
  CITIZEN = "Citizen",
  DISPATCH = "Dispatch",
  POLICE = "Police",
  FIRE = "Fire",
  NURSE = "Nurse",
  CITY_DIRECTOR = "City Director",
  POLICE_CHIEF = "Police Chief",
  FIRE_CHIEF = "Fire Chief",
  ADMINISTRATOR = "Administrator",
}

export default ROLES;
