// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWRMJY16-ENsWU90aeucEHdhoTwt4FiYs",
  authDomain: "alexpint-332c7.firebaseapp.com",
  projectId: "alexpint-332c7",
  storageBucket: "alexpint-332c7.firebasestorage.app",
  messagingSenderId: "306771893719",
  appId: "1:306771893719:web:3462650d66b06119ac3f92",
  measurementId: "G-L445T7HNHR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export db to be used in other files
export { db };
