var firebaseConfig = {
  apiKey: "AIzaSyD9VMhxcCLSbspy0KcrBJdzsulPSUgGJ24",
  authDomain: "budgetapp-eeg.firebaseapp.com",
  projectId: "budgetapp-eeg",
  storageBucket: "budgetapp-eeg.firebasestorage.app",
  messagingSenderId: "310496244438",
  appId: "1:310496244438:web:36fa2757f877bcb4b3cf77",
  measurementId: "G-SMHR22E2SP"
};
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();