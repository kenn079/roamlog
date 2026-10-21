/**
 * Firebase Authentication & Cloud Firestore Real-time Sync for RoamLog
 * Enables 1-click Google Login and instant multi-device real-time sync with offline persistence.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseConfig } from './firebaseConfig';
import type { BackupPayload, Companion, Footprint, Trip, Wish } from '../../shared/types';

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (appInstance) return appInstance;
  const existing = getApps();
  if (existing.length > 0) {
    appInstance = existing[0];
  } else {
    appInstance = initializeApp(getFirebaseConfig());
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export function getFirebaseFirestore(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getFirebaseApp());
  }
  return firestoreInstance;
}

/**
 * 1-Click Google Sign In using Firebase Popup
 */
export async function loginWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  if (typeof provider.setCustomParameters === 'function') {
    provider.setCustomParameters({ prompt: 'select_account' });
  }
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/**
 * Sign out current Firebase user
 */
export async function logoutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

/**
 * Listen to auth state changes (login, logout, session restoration)
 */
export function onFirebaseAuthState(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

/**
 * Delete a document from a user's Firestore subcollection
 */
export async function deleteFromFirebase(
  uid: string,
  collectionName: 'footprints' | 'wishes' | 'trips' | 'companions',
  id: string
): Promise<void> {
  const db = getFirebaseFirestore();
  const ref = doc(db, 'users', uid, collectionName, id);
  await deleteDoc(ref);
}

/**
 * Persist and retrieve tombstoned deleted IDs in LocalStorage
 */
export function getLocalDeletedIds(): string[] {
  try {
    const raw = localStorage.getItem('roamlog_deleted_ids');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordLocalDeletedId(id: string): void {
  try {
    const current = new Set(getLocalDeletedIds());
    current.add(id);
    localStorage.setItem('roamlog_deleted_ids', JSON.stringify(Array.from(current)));
  } catch {
    // ignore
  }
}

export async function fetchRemoteDeletedIds(uid: string): Promise<string[]> {
  try {
    const db = getFirebaseFirestore();
    const metaDoc = await getDoc(doc(db, 'users', uid, 'meta', 'deletions'));
    if (metaDoc.exists()) {
      return (metaDoc.data()?.ids as string[]) || [];
    }
  } catch {
    // ignore
  }
  return [];
}

export async function saveRemoteDeletedIds(uid: string, ids: string[]): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    await setDoc(
      doc(db, 'users', uid, 'meta', 'deletions'),
      {
        ids,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch {
    // ignore
  }
}

/**
 * Fetch all remote data from user's subcollections in Cloud Firestore
 */
export async function fetchRemoteFirebaseData(uid: string): Promise<BackupPayload> {
  const db = getFirebaseFirestore();

  const [fpSnap, wishSnap, tripSnap, compSnap] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'footprints')),
    getDocs(collection(db, 'users', uid, 'wishes')),
    getDocs(collection(db, 'users', uid, 'trips')),
    getDocs(collection(db, 'users', uid, 'companions')),
  ]);

  const footprints: Footprint[] = fpSnap.docs.map((d) => d.data() as Footprint);
  const wishes: Wish[] = wishSnap.docs.map((d) => d.data() as Wish);
  const trips: Trip[] = tripSnap.docs.map((d) => d.data() as Trip);
  const companions: Companion[] = compSnap.docs.map((d) => d.data() as Companion);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    footprints,
    wishes,
    trips,
    companions,
  };
}

/**
 * Upload local backup payload to user's Cloud Firestore subcollections using batched writes
 */
export async function uploadToFirebase(uid: string, payload: BackupPayload): Promise<void> {
  const db = getFirebaseFirestore();

  // Helper to commit batches within 400 op limits
  let currentBatch = writeBatch(db);
  let opCount = 0;

  async function addBatchOp(ref: any, data: any) {
    currentBatch.set(ref, data, { merge: true });
    opCount++;
    if (opCount >= 400) {
      await currentBatch.commit();
      currentBatch = writeBatch(db);
      opCount = 0;
    }
  }

  // 1. Footprints
  for (const fp of payload.footprints || []) {
    const ref = doc(db, 'users', uid, 'footprints', fp.id);
    await addBatchOp(ref, fp);
  }

  // 2. Wishes
  for (const w of payload.wishes || []) {
    const ref = doc(db, 'users', uid, 'wishes', w.id);
    await addBatchOp(ref, w);
  }

  // 3. Trips
  for (const t of payload.trips || []) {
    const ref = doc(db, 'users', uid, 'trips', t.id);
    await addBatchOp(ref, t);
  }

  // 4. Companions
  for (const c of payload.companions || []) {
    const ref = doc(db, 'users', uid, 'companions', c.id);
    await addBatchOp(ref, c);
  }

  // 5. Meta doc
  const metaRef = doc(db, 'users', uid, 'meta', 'sync');
  await addBatchOp(metaRef, {
    lastModified: new Date().toISOString(),
    photoCount: (payload.footprints || []).reduce((acc, f) => acc + (f.photos?.length || 0), 0),
  });

  if (opCount > 0) {
    await currentBatch.commit();
  }
}

/**
 * Subscribes to real-time changes in Firestore subcollections.
 * Triggers callback whenever another device updates footprints or wishes.
 */
export function subscribeToFirebaseChanges(
  uid: string,
  onRemoteUpdate: () => void
): Unsubscribe {
  const db = getFirebaseFirestore();

  let initialLoad = true;

  // Listen to footprints
  const unsubFp = onSnapshot(collection(db, 'users', uid, 'footprints'), () => {
    if (initialLoad) return;
    onRemoteUpdate();
  });

  // Listen to wishes
  const unsubWish = onSnapshot(collection(db, 'users', uid, 'wishes'), () => {
    if (initialLoad) return;
    onRemoteUpdate();
  });

  // Listen to trips
  const unsubTrip = onSnapshot(collection(db, 'users', uid, 'trips'), () => {
    if (initialLoad) return;
    onRemoteUpdate();
  });

  // Allow initial listener setup without false trigger
  setTimeout(() => {
    initialLoad = false;
  }, 1000);

  return () => {
    unsubFp();
    unsubWish();
    unsubTrip();
  };
}
