// firebase-config.js
// ─── FILL IN YOUR FIREBASE PROJECT DETAILS BELOW ────────────────
// 1. Go to https://console.firebase.google.com
// 2. Create a project → Add Web App → copy the config object below
// 3. Enable Realtime Database (Build → Realtime Database → Create Database → Test mode)

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// Initialize Firebase app
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
