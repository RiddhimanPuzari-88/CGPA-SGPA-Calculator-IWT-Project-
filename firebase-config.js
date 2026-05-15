// firebase-config.js

const firebaseConfig = {
  apiKey:            "AIzaSyBJIqdVwetLQ0upqWL0eK5pQr8NEtd5XDs",
  authDomain:        "ku-calculator.firebaseapp.com",
  databaseURL:       "https://ku-calculator-default-rtdb.firebaseio.com",
  projectId:         "ku-calculator",
  storageBucket:     "ku-calculator.firebasestorage.app",
  messagingSenderId: "639971125149",
  appId:             "1:639971125149:web:288a164634a6114971b174"
};

// Initialize Firebase app
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
