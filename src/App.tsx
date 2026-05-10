import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/context/GameContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { AdminProvider } from "@/context/AdminContext";
import Home from "./pages/Home";
import WorldMap from "./pages/WorldMap";
import LevelScreen from "./pages/LevelScreen";
import LessonNotes from "./pages/LessonNotes";
import ChallengeMode from "./pages/ChallengeMode";
import Progress from "./pages/Progress";
import Rewards from "./pages/Rewards";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Quests from "./pages/Quests";
import Auth from "./pages/Auth";
import DailyLogin from "./pages/DailyLogin";
import CustomizeAvatar from "./pages/CustomizeAvatar";
import DevCurriculum from "./pages/DevCurriculum";
import NotFound from "./pages/NotFound";

import { FirebaseProvider } from "@/context/FirebaseContext";

import { TimeWarp } from "@/components/DevTools/TimeWarp";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider>
        <FirebaseProvider>
          <SettingsProvider>
            <AdminProvider>
              <GameProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/daily-login" element={<DailyLogin />} />
                  <Route path="/customize-avatar" element={<CustomizeAvatar />} />
                  <Route path="/world/:worldId" element={<WorldMap />} />
                  <Route path="/world/:worldId/:levelIndex" element={<LevelScreen />} />
                  <Route path="/world/:worldId/:levelIndex/:lessonIndex" element={<LessonNotes />} />
                  <Route path="/world/:worldId/:levelIndex/:lessonIndex/challenge" element={<ChallengeMode />} />
                  <Route path="/progress" element={<Progress />} />
                  <Route path="/rewards" element={<Rewards />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/dev/curriculum" element={<DevCurriculum />} />
                  {/* Quests moved to side panel on Home */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <TimeWarp />
              </BrowserRouter>
            </GameProvider>
          </AdminProvider>
        </SettingsProvider>
      </FirebaseProvider>
    </ThemeProvider>
  </TooltipProvider>
</QueryClientProvider>
);

export default App;
