import type { DistributionGroup, DistributionGroupCriteria } from '../../../services/adminRbacService';

/** Audience kinds, matching the legacy "Audience type" choice. */
export type AudienceKind = 'criteria' | 'selected';
export type GenderOption = '' | 'male' | 'female';
export type CountryOption = '' | 'ghana' | 'international';
export type AccountStateOption = 'active' | 'blocked' | 'any';

/** Limits enforced by the adminCreateDistributionGroup and adminUpdateDistributionGroup callables. */
export const AUDIENCE_NAME_MIN = 2;
export const AUDIENCE_NAME_MAX = 80;
export const AUDIENCE_DESCRIPTION_MAX = 240;
export const AUDIENCE_MAX_SELECTED_USERS = 5000;

export interface AudienceFormValues {
  name: string;
  description: string;
  kind: AudienceKind;
  gender: GenderOption;
  country: CountryOption;
  /** City as typed. Only the part before the first comma is matched, as the server does. */
  location: string;
  accountState: AccountStateOption;
  userIds: string[];
}

export interface AudienceSaveInput {
  name: string;
  description: string;
  criteria: DistributionGroupCriteria;
}

export const emptyAudienceForm = (): AudienceFormValues => ({
  name: '',
  description: '',
  kind: 'criteria',
  gender: '',
  country: '',
  location: '',
  accountState: 'active',
  userIds: [],
});

export const GENDER_OPTIONS: readonly GenderOption[] = ['male', 'female'];
export const COUNTRY_OPTIONS: readonly CountryOption[] = ['ghana', 'international'];
export const ACCOUNT_STATE_OPTIONS: readonly AccountStateOption[] = ['active', 'blocked', 'any'];

function firstOf<T extends string>(values: string[] | undefined, allowed: readonly T[], fallback: T): T {
  const match = values?.find((value): value is T => (allowed as readonly string[]).includes(value));
  return match ?? fallback;
}

/**
 * Whether a saved audience uses more values than this form can show. Saving it from
 * the form would keep only the first value, so the editor warns about this.
 */
export function hasMultiValueCriteria(group: DistributionGroup): boolean {
  const criteria = group.criteria;
  return (criteria?.gender?.length ?? 0) > 1 || (criteria?.country?.length ?? 0) > 1 || (criteria?.locations?.length ?? 0) > 1;
}

export function audienceFormFromGroup(group: DistributionGroup): AudienceFormValues {
  const criteria = group.criteria;
  const kind = audienceKindOf(group);
  return {
    name: group.name,
    description: group.description ?? '',
    kind,
    gender: firstOf(criteria?.gender, GENDER_OPTIONS, ''),
    country: firstOf(criteria?.country, COUNTRY_OPTIONS, ''),
    location: criteria?.locations?.[0] ?? '',
    accountState: criteria?.accountState && ACCOUNT_STATE_OPTIONS.includes(criteria.accountState) ? criteria.accountState : 'active',
    userIds: [...(criteria?.userIds ?? [])],
  };
}

/** Normalises the city the way the server matches it: lower case, text before the first comma. */
export function normaliseCity(value: string): string {
  return value.split(',')[0].trim().toLowerCase();
}

export function criteriaFromForm(values: AudienceFormValues): DistributionGroupCriteria {
  if (values.kind === 'selected') {
    return {
      mode: 'selected',
      userIds: [...values.userIds],
      gender: [],
      country: [],
      locations: [],
      accountState: values.accountState,
    };
  }
  const city = normaliseCity(values.location);
  return {
    mode: 'criteria',
    userIds: [],
    gender: values.gender ? [values.gender] : [],
    country: values.country ? [values.country] : [],
    locations: city ? [city] : [],
    accountState: values.accountState,
  };
}

/** Returns a message for the first problem found, or null when the form can be saved. */
export function validateAudienceForm(values: AudienceFormValues): string | null {
  const name = values.name.trim();
  if (name.length < AUDIENCE_NAME_MIN || name.length > AUDIENCE_NAME_MAX) {
    return `Enter an audience name between ${AUDIENCE_NAME_MIN} and ${AUDIENCE_NAME_MAX} characters.`;
  }
  if (values.description.trim().length > AUDIENCE_DESCRIPTION_MAX) {
    return `The description can be at most ${AUDIENCE_DESCRIPTION_MAX} characters.`;
  }
  if (values.kind === 'selected') {
    if (values.userIds.length === 0) return 'Select at least one user for a custom audience.';
    if (values.userIds.length > AUDIENCE_MAX_SELECTED_USERS) {
      return `A custom audience can contain at most ${AUDIENCE_MAX_SELECTED_USERS.toLocaleString('en-GB')} users.`;
    }
  }
  return null;
}

/** The audience kind as stored; falls back to inferring it from selected users when mode is missing (legacy rule). */
export function audienceKindOf(group: DistributionGroup): AudienceKind {
  return group.criteria?.mode ?? ((group.criteria?.userIds?.length ?? 0) > 0 ? 'selected' : 'criteria');
}

export function audienceKindLabel(group: DistributionGroup): 'System' | 'Custom' | 'Dynamic' {
  if (group.system) return 'System';
  return audienceKindOf(group) === 'selected' ? 'Custom' : 'Dynamic';
}

const listOrAny = (values: string[] | undefined): string => (values && values.length > 0 ? values.join(', ') : 'Any');

/** Human-readable summary of an audience's rules. */
export function criteriaSummary(group: DistributionGroup): string {
  const criteria = group.criteria;
  if (criteria?.mode === 'selected') {
    return `Custom users: ${criteria.userIds?.length || group.memberCount || 0}`;
  }
  return `Gender: ${listOrAny(criteria?.gender)} · Country: ${listOrAny(criteria?.country)} · City: ${listOrAny(criteria?.locations)} · State: ${criteria?.accountState ?? 'active'}`;
}
