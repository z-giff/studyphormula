import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { isAppUnlocked } from "@/lib/launchGate";
import Waitlist from "./pages/Waitlist";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import FlashcardSetPage from "./pages/FlashcardSet";
import StudyMode from "./pages/StudyMode";
import QuizMode from "./pages/QuizMode";
import FilePage from "./pages/File";
import BookmarksSet from "./pages/BookmarksSet";
import NotFound from "./pages/NotFound";
 import SwipeStudy from "./pages/SwipeStudy";
import OAuthConsent from "./pages/OAuthConsent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            {isAppUnlocked() ? (
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/file/:id" element={<FilePage />} />
                <Route path="/set/bookmarks" element={<BookmarksSet />} />
                <Route path="/set/:id" element={<FlashcardSetPage />} />
                <Route path="/study/:id" element={<StudyMode />} />
                <Route path="/quiz/:id" element={<QuizMode />} />
                <Route path="/swipe/:id" element={<SwipeStudy />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            ) : (
              /* Pre-launch gate: everything funnels to the waitlist.
                 Developers unlock the full app via ?dev=<key> — see src/lib/launchGate.ts */
              <Routes>
                <Route path="/" element={<Waitlist />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            )}
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
