import { initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyC58K6ZpXrNTd4z61977_tZEbGTv_62coU",
    authDomain: "play-it-again-14d52.firebaseapp.com",
    projectId: "play-it-again-14d52",
    storageBucket: "play-it-again-14d52.firebasestorage.app",
    messagingSenderId: "397130859823",
    appId: "1:397130859823:web:81f37a5bde5e114e318dda"
  };

const app = initializeApp(firebaseConfig);

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export const storageBucket = firebaseConfig.storageBucket;

export default app;
