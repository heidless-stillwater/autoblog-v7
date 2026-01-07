import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyAQ1mxB2uj86qOAXlT_mUQitK61PQiqXYY",
    authDomain: "heidless-firebase.firebaseapp.com",
    projectId: "heidless-firebase",
    storageBucket: "heidless-firebase.firebasestorage.app",
    messagingSenderId: "232488530911",
    appId: "1:232488530911:web:13e99380c94d2db4110a6a",
    measurementId: "G-V5L8MF8PZD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with explicit database ID: autoblog-db-0
export const db = getFirestore(app, 'autoblog-db-0');

// Local Emulator Support
const useEmulators =
    import.meta.env.VITE_USE_EMULATORS === 'true' ||
    (typeof window !== 'undefined' && window.location.search.includes('useEmulator=true'));

if (useEmulators) {
    console.log('Connecting to Firebase Emulators...');
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
}

export default app;
