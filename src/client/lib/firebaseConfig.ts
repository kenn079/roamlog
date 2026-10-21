/**
 * Firebase Project Configuration for RoamLog
 */
export const defaultFirebaseConfig = {
  apiKey: "AIzaSyA3LrvSY4YGqD60QISNaLB9mkeFV8VR3xM",
  authDomain: "roamlog-c9a2e.firebaseapp.com",
  projectId: "roamlog-c9a2e",
  storageBucket: "roamlog-c9a2e.firebasestorage.app",
  messagingSenderId: "1008547344562",
  appId: "1:1008547344562:web:4c7a2774de1e15633d99ab",
  measurementId: "G-KY5SE53LQ4",
};

export function getFirebaseConfig() {
  try {
    const custom = localStorage.getItem('roamlog_custom_firebase_config');
    if (custom) {
      return JSON.parse(custom);
    }
  } catch {
    // fallback
  }
  return defaultFirebaseConfig;
}
