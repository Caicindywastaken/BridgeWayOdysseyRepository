import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocFromServer,
  Timestamp 
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface UserData {
  current_streak: number;
  highest_streak: number;
  last_login_date: string; // ISO timestamp
  onboardingDone?: boolean;
}

interface FirebaseContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  mockDate: Date | null;
  setMockDate: (date: Date | null) => void;
  refreshStreak: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mockDate, setMockDate] = useState<Date | null>(null);

  const getCurrentTime = () => mockDate || new Date();

  // Validate connection to Firestore as per instructions
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  const handleStreakLogic = async (uid: string) => {
    const userDocRef = doc(db, "users", uid);
    let userDoc;
    try {
      userDoc = await getDoc(userDocRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      return;
    }

    const now = getCurrentTime();
    const nowISO = now.toISOString();

    if (!userDoc.exists()) {
      // First login: create document
      const initialData: UserData = {
        current_streak: 1,
        highest_streak: 1,
        last_login_date: nowISO,
        onboardingDone: false,
      };
      try {
        await setDoc(userDocRef, initialData);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
      }
      setUserData(initialData);
    } else {
      const data = userDoc.data() as UserData;
      const lastLogin = new Date(data.last_login_date);
      
      const diffMs = now.getTime() - lastLogin.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Same calendar day check
      const isSameDay = now.toDateString() === lastLogin.toDateString();

      if (isSameDay) {
        // No change if same calendar day
        setUserData(data);
        return;
      }

      let newStreak = data.current_streak;
      let newHighest = data.highest_streak;

      if (diffHours >= 24 && diffHours <= 48) {
        // Increment streak
        newStreak += 1;
        if (newStreak > newHighest) {
          newHighest = newStreak;
        }
      } else if (diffHours > 48) {
        // Reset streak
        newStreak = 1;
      }
      
      const updatedData: UserData = {
        ...data,
        current_streak: newStreak,
        highest_streak: newHighest,
        last_login_date: nowISO,
      };

      try {
        await updateDoc(userDocRef, {
          current_streak: newStreak,
          highest_streak: newHighest,
          last_login_date: nowISO,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
      }
      setUserData(updatedData);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await handleStreakLogic(currentUser.uid);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refreshStreak = async () => {
    if (user) {
      await handleStreakLogic(user.uid);
    }
  };

  return (
    <FirebaseContext.Provider 
      value={{ 
        user, 
        userData, 
        loading, 
        signInWithGoogle, 
        logout, 
        mockDate, 
        setMockDate,
        refreshStreak 
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return context;
};
