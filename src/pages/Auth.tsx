import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket, Mail, Lock, User, Eye, EyeOff, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import PageTransition from "@/components/PageTransition";
import { useFirebase } from "@/context/FirebaseContext";

const Auth = () => {
  const { user, loading: firebaseLoading, signInWithGoogle } = useFirebase();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !firebaseLoading) {
      navigate("/daily-login");
    }
  }, [user, firebaseLoading, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast({ title: "Welcome! 🚀", description: "Your adventure begins now." });
    } catch (error: any) {
      toast({
        title: "Login failed 😅",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen max-w-lg mx-auto nebula-bg relative flex items-center justify-center p-6">
        <div className="starfield" />
        <div className="relative z-10 w-full">
          {/* Logo */}
          <div className="text-center mb-8 animate-slide-up">
            <div className="w-20 h-20 rounded-full gradient-purple-blue mx-auto flex items-center justify-center text-4xl glow-primary animate-float mb-4">
              👽
            </div>
            <h1 className="text-3xl font-extrabold font-display text-glow text-primary">
              BridgeWay Odyssey
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Your Career Adventure Awaits</p>
          </div>

          {/* Auth card */}
          <div className="glass-card rounded-3xl p-8 border-2 border-primary/20 shadow-elevated animate-bounce-in text-center">
            <h2 className="text-xl font-bold font-display mb-6">
              Ready for your mission? 🚀
            </h2>

            <p className="text-sm text-muted-foreground mb-8">
              Sign in with your Google account to track your progress and maintain your login streak.
            </p>

            <Button
              onClick={handleGoogleLogin}
              disabled={loading || firebaseLoading}
              className="w-full h-14 bg-white text-black hover:bg-white/90 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg border border-gray-200 transition-all active:scale-95"
            >
              {loading ? (
                <span className="animate-pulse">Launching...</span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </Button>

            <div className="mt-8 pt-8 border-t border-primary/10">
              <p className="text-xs text-muted-foreground">
                By signing in, you agree to the galactic terms of service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Auth;
