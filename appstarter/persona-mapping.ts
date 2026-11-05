import { OrgRole, type OrgRoleType } from './org-role.enum';

export const DEMO_PERSONAS = {
  engineering: { label: 'Engineering', organizationRole: OrgRole.ADMIN },
  support: { label: 'Support', organizationRole: OrgRole.MEMBER },
} as const satisfies Record<string, { label: string; organizationRole: OrgRoleType }>;

export type DemoPersona = keyof typeof DEMO_PERSONAS;

export function canAppendSourceVersion(persona: DemoPersona): boolean {
  const assignedRole = DEMO_PERSONAS[persona].organizationRole as OrgRole;
  return assignedRole === OrgRole.ADMIN || assignedRole === OrgRole.OWNER;
}
