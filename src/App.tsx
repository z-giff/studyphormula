import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const FlashcardSetPage = lazy(() => import("./pages/FlashcardSet"));
const StudyMode = lazy(() => import("./pages/StudyMode"));
const QuizMode = lazy(() => import("./pages/QuizMode"));
const FilePage = lazy(() => import("./pages/File"));
const BookmarksSet = lazy(() => import("./pages/BookmarksSet"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SwipeStudy = lazy(() => import("./pages/SwipeStudy"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>}>
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
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
