import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserTask, UserSchedule, AdviceLog } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// Authentication Provider Setup
const provider = new GoogleAuthProvider();

// Request Required Workspace Scopes - Merged as per metadata
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/documents.readonly');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

// Flag to avoid conflicting sign-in actions
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Global Validation Guard for Firestore Errors (Mandated by Firebase Integration Skill)
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initialize Auth listener and load/verify connection (Prerequisite validation constraint)
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Test Firestore Connection using validation check
  const testConnection = async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  };
  testConnection();

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Try to fetch token if available or request explicit sign in
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Initiate Google Sign In (popup-based for safety)
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve OAuth access token from Google Sign-In.');
    }
    cachedAccessToken = credential.accessToken;
    
    // Register or Sync User profile in Firestore securely
    const userDocRef = doc(db, 'users', result.user.uid);
    const userPayload = {
      displayName: result.user.displayName || 'Shadow User',
      email: result.user.email || '',
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(userDocRef, userPayload);
    } catch (err) {
      console.warn("Failed to update user profile in Firestore:", err);
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Core Sign-In Exception:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Firestore CRUD API wrappers with mandatory error wrappers

// Tasks Firestore CRUD
export const tasksRef = (uid: string) => `users/${uid}/tasks`;

export const subscribeTasks = (uid: string, callback: (tasks: UserTask[]) => void, errorCallback: (error: Error) => void) => {
  const collectionPath = tasksRef(uid);
  return onSnapshot(
    collection(db, collectionPath),
    (snapshot) => {
      const items: UserTask[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as UserTask);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, collectionPath);
    }
  );
};

export const saveTask = async (uid: string, task: Omit<UserTask, 'ownerId'>): Promise<void> => {
  const path = `${tasksRef(uid)}/${task.id}`;
  try {
    const payload: UserTask = {
      ...task,
      ownerId: uid,
    };
    await setDoc(doc(db, tasksRef(uid), task.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteTask = async (uid: string, taskId: string): Promise<void> => {
  const path = `${tasksRef(uid)}/${taskId}`;
  try {
    await deleteDoc(doc(db, tasksRef(uid), taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Schedules Firestore CRUD
export const schedulesRef = (uid: string) => `users/${uid}/schedules`;

export const subscribeSchedules = (uid: string, callback: (schedules: UserSchedule[]) => void) => {
  const collectionPath = schedulesRef(uid);
  return onSnapshot(
    collection(db, collectionPath),
    (snapshot) => {
      const items: UserSchedule[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as UserSchedule);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, collectionPath);
    }
  );
};

export const saveSchedule = async (uid: string, event: Omit<UserSchedule, 'ownerId'>): Promise<void> => {
  const path = `${schedulesRef(uid)}/${event.id}`;
  try {
    const payload: UserSchedule = {
      ...event,
      ownerId: uid,
    };
    await setDoc(doc(db, schedulesRef(uid), event.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteSchedule = async (uid: string, scheduleId: string): Promise<void> => {
  const path = `${schedulesRef(uid)}/${scheduleId}`;
  try {
    await deleteDoc(doc(db, schedulesRef(uid), scheduleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Advice Logs API and historical syncing
export const adviceLogsRef = (uid: string) => `users/${uid}/advice_logs`;

export const getAdviceLogs = async (uid: string): Promise<AdviceLog[]> => {
  const colPath = adviceLogsRef(uid);
  try {
    const snapshot = await getDocs(collection(db, colPath));
    const items: AdviceLog[] = [];
    snapshot.forEach((d) => {
      items.push({ id: d.id, ...d.data() } as AdviceLog);
    });
    return items.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, colPath);
  }
};

export const createAdviceLog = async (uid: string, log: Omit<AdviceLog, 'ownerId'>): Promise<void> => {
  const path = `${adviceLogsRef(uid)}/${log.id}`;
  try {
    const payload: AdviceLog = { ...log, ownerId: uid };
    await setDoc(doc(db, adviceLogsRef(uid), log.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};
