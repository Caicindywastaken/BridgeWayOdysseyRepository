import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const ADMIN_EMAILS = [
  "caicindy2009@gmail.com",
  "cai.227010@tzuchi.edu.my",
  "qianhui0698@gmail.com",
  "theinyuxuan09@gmail.com",
  "chong.227031@tzuchi.edu.my",
];

interface AdminContextType {
  isAdmin: boolean;
  devMode: boolean;
  grantedEmails: string[];
  coreAdminEmails: string[];
  allAdminEmails: string[];
  grantAdmin: (email: string) => void;
  revokeAdmin: (email: string) => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
};

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [grantedEmails, setGrantedEmails] = useState<string[]>(() => {
    const saved = localStorage.getItem("bridgeway-granted-admins");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email?.toLowerCase() || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem("bridgeway-granted-admins", JSON.stringify(grantedEmails));
  }, [grantedEmails]);

  const coreAdminEmails = ADMIN_EMAILS.map(e => e.toLowerCase());
  const allAdminEmails = [...new Set([...coreAdminEmails, ...grantedEmails.map(e => e.toLowerCase())])];
  const isAdmin = !!userEmail && allAdminEmails.includes(userEmail);

  const grantAdmin = useCallback((email: string) => {
    const lower = email.toLowerCase().trim();
    if (lower && !ADMIN_EMAILS.includes(lower) && !grantedEmails.includes(lower)) {
      setGrantedEmails(prev => [...prev, lower]);
    }
  }, [grantedEmails]);

  const revokeAdmin = useCallback((email: string) => {
    setGrantedEmails(prev => prev.filter(e => e !== email.toLowerCase().trim()));
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, devMode: isAdmin, grantedEmails, coreAdminEmails, allAdminEmails, grantAdmin, revokeAdmin }}>
      {children}
    </AdminContext.Provider>
  );
};
