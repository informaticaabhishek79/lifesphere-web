'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Contact, Household, HouseholdDetail, Locality, ServiceCategory, TaskCategory } from './types';
import { useSession } from './session';

export const useHouseholds = (enabled = true) => useQuery({ queryKey: ['households'], queryFn: () => api.get<Household[]>('/v1/households'), enabled, staleTime: 60_000 });

export const useHousehold = (id?: string | null) =>
  useQuery({ queryKey: ['household', id], queryFn: () => api.get<HouseholdDetail>(`/v1/households/${id}`), enabled: !!id, staleTime: 60_000 });

export const useContacts = (enabled = true) => useQuery({ queryKey: ['contacts'], queryFn: () => api.get<Contact[]>('/v1/contacts'), enabled, staleTime: 60_000 });

export const useTaskCategories = () => useQuery({ queryKey: ['task-categories'], queryFn: () => api.get<TaskCategory[]>('/v1/task-categories'), staleTime: 60_000 });

export const useLocalities = (search?: string) =>
  useQuery({ queryKey: ['localities', search ?? ''], queryFn: () => api.get<Locality[]>('/v1/localities', { search: search || undefined }), staleTime: 5 * 60_000 });

export const useServiceCategories = () =>
  useQuery({ queryKey: ['service-categories'], queryFn: () => api.get<ServiceCategory[]>('/v1/services/categories'), staleTime: 10 * 60_000 });

export interface Person {
  userId: string;
  displayName: string;
  source: 'me' | 'contact' | 'household';
}

/**
 * Everyone the user can name in a picker: themselves, trusted contacts and members of their households.
 * Picking someone never grants access by itself; the API checks the right sharing permission.
 */
export function usePeople() {
  const { me } = useSession();
  const contacts = useContacts();
  const households = useHouseholds();
  const details = useQueries({
    queries: (households.data ?? []).map((h) => ({ queryKey: ['household', h.id], queryFn: () => api.get<HouseholdDetail>(`/v1/households/${h.id}`), staleTime: 60_000 })),
  });
  const map = new Map<string, Person>();
  map.set(me.id, { userId: me.id, displayName: me.profile.displayName, source: 'me' });
  for (const c of contacts.data ?? []) if (!map.has(c.contactUserId)) map.set(c.contactUserId, { userId: c.contactUserId, displayName: c.displayName, source: 'contact' });
  for (const d of details) for (const m of d.data?.members ?? []) if (!map.has(m.userId)) map.set(m.userId, { userId: m.userId, displayName: m.displayName, source: 'household' });
  const people = [...map.values()];
  return {
    people,
    nameOf: (id?: string | null) => (id ? map.get(id)?.displayName : undefined),
    others: people.filter((p) => p.userId !== me.id),
  };
}
