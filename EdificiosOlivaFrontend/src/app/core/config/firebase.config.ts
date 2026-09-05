import { initializeApp } from 'firebase/app';

export const firebaseConfig = {
  apiKey: 'AIzaSyAnIF-bv4MoJMAOaFeYHXEBarJtCx53TTo',
  authDomain: 'edificios-oliva.firebaseapp.com',
  projectId: 'edificios-oliva',
  storageBucket: 'edificios-oliva.firebasestorage.app',
  messagingSenderId: '134176255335',
  appId: '1:134176255335:web:520e74de5ac8d1830753c2',
};

export const firebaseApp = initializeApp(firebaseConfig);
