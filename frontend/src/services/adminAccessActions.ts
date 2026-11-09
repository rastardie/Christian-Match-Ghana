/**
 * Admin actions used by the Access, Overview, and Prayers panels.
 * Callable permission checks and Firestore rules still apply on the server; these
 * helpers shape requests and handle the client-side steps (batching, CSV, probes).
 */
import { collection, deleteDoc, doc, getDocs, limit, query, writeBatch } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { getAdminUsers } from './adminService';

/** Firestore allows up to 500 writes per batch; stay safely under that. */
const BATCH_LIMIT = 450;

export interface AdminUserSummary {
  id: string;
  name?: string;
  email?: string;
  location?: string;
  country?: string;
  isBlocked?: boolean;
  isVerified?: boolean;
  isPremium?: boolean;
  createdAt?: unknown;
}

/** Platform users keyed by Firestore document ID (newest first, as returned by getAdminUsers). */
export async function loadAdminUserSummaries(): Promise<AdminUserSummary[]> {
  const rows = await getAdminUsers();
  return rows.map((row) => ({ ...row, id: row.firestoreDocId }));
}

export interface SaveAdminGroupInput {
  /** Set when editing an existing group. Omit to create one (the server derives the ID from the name). */
  groupId?: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface SavedAdminGroup {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

/** Same ID rule the server applies to a newly created group. Used to catch name collisions before saving. */
export function groupIdFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Creates or updates a permission group. groupId is sent explicitly: the server only
 * updates an existing group when it receives groupId; otherwise it derives a new ID from the name.
 */
export async function saveAdminGroup(input: SaveAdminGroupInput): Promise<SavedAdminGroup> {
  const call = httpsCallable(functions, 'adminUpsertGroup');
  const payload = {
    groupId: input.groupId,
    name: input.name.trim(),
    description: input.description.trim(),
    permissions: input.permissions,
  };
  return (await call(payload)).data as SavedAdminGroup;
}

/**
 * Deletes a prayer request and its comments. Comments are removed first in batches so a
 * deleted prayer never keeps orphaned comments. Rules allow admins to delete both.
 */
export async function deletePrayerRequest(prayerId: string): Promise<void> {
  if (!prayerId) throw new Error('The prayer request ID is missing.');
  const comments = await getDocs(collection(db, 'prayer_requests', prayerId, 'comments'));
  for (let start = 0; start < comments.docs.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const comment of comments.docs.slice(start, start + BATCH_LIMIT)) {
      batch.delete(comment.ref);
    }
    await batch.commit();
  }
  await deleteDoc(doc(db, 'prayer_requests', prayerId));
}

/**
 * The reports collection has no read rule yet, so a read fails with permission-denied.
 * Returns false in that case so the UI can show "Not connected" instead of a misleading zero.
 */
export async function probeReportsAvailable(): Promise<boolean> {
  try {
    await getDocs(query(collection(db, 'reports'), limit(1)));
    return true;
  } catch (error) {
    console.warn('Reports are not readable from the admin console yet:', error);
    return false;
  }
}

type CsvCell = string | number;

/** Quotes a cell and neutralises spreadsheet formula injection (cells starting with = + - @ or tab/CR). */
function csvCell(value: CsvCell): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/** Builds RFC 4180 CSV text with a UTF-8 BOM so Excel reads non-Latin names correctly. */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const headerRow: CsvCell[] = headers;
  const lines = [headerRow, ...rows].map((cells) => cells.map(csvCell).join(','));
  return `\uFEFF${lines.join('\r\n')}`;
}

/** Downloads CSV text through a temporary object URL. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
