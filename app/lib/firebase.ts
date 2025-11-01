

// firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ Load Firebase config from environment variables
const firebaseConfig = {
  apiKey: "AIzaSyAssiO_G6ySfZObw4aS61YrMWE3aT1V6D4",
  authDomain: "jobapp-e70df.firebaseapp.com",
  projectId: "jobapp-e70df",
  storageBucket: "jobapp-e70df.firebasestorage.app",
  messagingSenderId: "616015584643",
  appId: "1:616015584643:web:8aadf07e5885b6bfc02ab6",
  measurementId: "G-6EYT8ESR99"
};
// ✅ Prevent "app already initialized" error (common in Next.js)
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Creates or updates the initial user profile data in Firestore.
 * Path: users/{uid}/data/profile
 */
export const createInitialUserData = async (
  uid: string,
  displayName: string | null = null,
  email: string | null = null
): Promise<void> => {
  try {
    const userRef = doc(db, "users", uid, "data", "profile");
    const userSnap = await getDoc(userRef);

    // Only create data if it doesn't exist yet
    if (!userSnap.exists()) {
      await setDoc(
        userRef,
        {
          displayName: displayName || "New User",
          email: email || "",
          createdAt: serverTimestamp(),
          jobData: {
            jobsApplied: 0,
            savedJobs: 0,
            interviews: 0,
            newMatches: 0,
          },
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error("Error creating initial user data:", error);
  }
};
