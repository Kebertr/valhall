import { SetMetadata } from '@nestjs/common';

export const Role = {
  ADMIN: 'ADMIN',
  BONGMEISTER: 'BONGMEISTER',
  ORDFORANDE: 'ORDFORANDE',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLES_KEY = 'auth:roles';


export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
