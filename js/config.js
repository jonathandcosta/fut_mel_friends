// Arquivo: js/config.js

const firebaseConfig = {
  apiKey: "AIzaSyB6_YZegBf3GO7s77c4Y4rfdcPeCgMkHO8",
  authDomain: "pelada-mel.firebaseapp.com",
  projectId: "pelada-mel",
  storageBucket: "pelada-mel.firebasestorage.app",
  messagingSenderId: "176369084558",
  appId: "1:176369084558:web:9efa7132d030fffddfc1df",
};

// Inicializa e joga no escopo global (window) para os outros arquivos usarem
firebase.initializeApp(firebaseConfig);
window.db = firebase.firestore();
console.log("Firebase conectado!");
