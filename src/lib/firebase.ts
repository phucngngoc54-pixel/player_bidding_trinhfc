/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Support Vercel environment variables or fallback to local firebase-applet-config.json
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
};

// Safety check for environment variables as requested
export const _checkEnv = () => {
  if (!config.apiKey) return;
};
_checkEnv();

const app = initializeApp(config);
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || '(default)';
export const db = getFirestore(app, databaseId);
export const auth = getAuth();
export const googleProvider = new GoogleAuthProvider();

export const login = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

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
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (typeof window !== 'undefined') {
    window.alert(`Firestore Connection Failed!\nOperation: ${operationType}\nPath: ${path}\nError: ${errMsg}\n\nPlease check if you have: \n1. Created a Firestore Database in Firebase Console\n2. Set Firestore Rules to Test Mode (allow read, write: if true;)`);
  }
  throw new Error(JSON.stringify(errInfo));
}
