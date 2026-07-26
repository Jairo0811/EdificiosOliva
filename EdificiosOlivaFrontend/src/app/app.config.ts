import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

import { provideRouter } from '@angular/router';

import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';

import { provideAuth, getAuth } from '@angular/fire/auth';

import { provideFirestore, getFirestore } from '@angular/fire/firestore';

import { provideStorage, getStorage } from '@angular/fire/storage';

import { firebaseConfig } from './core/config/firebase.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideRouter(routes),

    provideHttpClient(),

    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
  ],
};
