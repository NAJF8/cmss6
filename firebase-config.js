import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import { getDatabase, ref, get, set, update, push, child, onValue, remove } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyDtzonzkDsEvF9KNXi70j6ZTXG5kLAM_0c",
    authDomain: "cmms-37512.firebaseapp.com",
    databaseURL: "https://cmms-37512-default-rtdb.firebaseio.com",
    projectId: "cmms-37512",
    storageBucket: "cmms-37512.firebasestorage.app",
    messagingSenderId: "451592788539",
    appId: "1:451592788539:web:d3dc3e68b1543996b39a1e"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup, ref, get, set, update, push, child, onValue, remove };
