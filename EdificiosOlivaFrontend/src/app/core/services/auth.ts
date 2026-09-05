import { Injectable } from '@angular/core';
import {
  GoogleAuthProvider,
  User,
  UserCredential,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc, serverTimestamp } from 'firebase/firestore';
import { Observable, catchError, from, of, shareReplay, switchMap } from 'rxjs';

import { firebaseApp } from '../config/firebase.config';
import { AppUser } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly firebaseAuth = getAuth(firebaseApp);
  private readonly firestore = getFirestore(firebaseApp);

  readonly user$: Observable<User | null> = new Observable<User | null>((subscriber) =>
    onAuthStateChanged(
      this.firebaseAuth,
      (user) => subscriber.next(user),
      (error) => subscriber.error(error),
    ),
  ).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  readonly userProfile$: Observable<AppUser | null> = this.user$.pipe(
    switchMap((user) => {
      if (!user) {
        return of(null);
      }

      return from(this.getUserProfile(user.uid)).pipe(catchError(() => of(null)));
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.firebaseAuth, email.trim().toLowerCase(), password);
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();

    const credential = await signInWithPopup(this.firebaseAuth, provider);

    const user = credential.user;
    const userReference = doc(this.firestore, `users/${user.uid}`);

    const snapshot = await getDoc(userReference);

    if (!snapshot.exists()) {
      await setDoc(userReference, {
        uid: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Usuario',
        role: 'guest',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const currentProfile = snapshot.data() as AppUser;

      if (!currentProfile.displayName && user.displayName) {
        await setDoc(
          userReference,
          {
            displayName: user.displayName,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    }

    return credential;
  }

  logout(): Promise<void> {
    return signOut(this.firebaseAuth);
  }

  async getUserProfile(uid: string): Promise<AppUser | null> {
    const currentUser = this.firebaseAuth.currentUser;
    if (!currentUser || currentUser.uid !== uid) {
      return null;
    }

    const userReference = doc(this.firestore, `users/${uid}`);
    const [snapshot, tokenResult] = await Promise.all([
      getDoc(userReference),
      currentUser.getIdTokenResult(),
    ]);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data() as Omit<AppUser, 'uid'>;

    return {
      ...data,
      uid,
      role: this.hasAdminClaims(tokenResult.claims) ? 'admin' : 'guest',
    };
  }

  async isCurrentUserAdmin(forceRefresh = false): Promise<boolean> {
    const user = this.firebaseAuth.currentUser;
    if (!user) {
      return false;
    }

    const tokenResult = await user.getIdTokenResult(forceRefresh);
    return this.hasAdminClaims(tokenResult.claims);
  }

  private hasAdminClaims(claims: Record<string, unknown>): boolean {
    return claims['role'] === 'admin' && claims['email_verified'] === true;
  }
}
