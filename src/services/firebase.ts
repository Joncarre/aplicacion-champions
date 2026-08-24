import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

/**
 * Inicialización de Firebase.
 *
 * Las credenciales de una app web de Firebase son públicas por diseño: quien
 * abra la web puede verlas. Lo que protege los datos son las reglas de
 * Firestore (`firestore.rules`), no ocultar esta configuración.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app: FirebaseApp | null = null
let firestore: Firestore | null = null

export function getFirebaseApp(): FirebaseApp {
  if (app) return app
  app = getApps().length > 0 ? getApp() : initializeApp(config)
  return app
}

export function getDb(): Firestore {
  if (firestore) return firestore
  firestore = getFirestore(getFirebaseApp())
  return firestore
}
