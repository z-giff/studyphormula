 import { useEffect, useState, useCallback } from "react";
 import { useParams, useNavigate, Link } from "react-router-dom";
 import { useAuth } from "@/hooks/useAuth";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { ArrowLeft, RotateCcw, X, Check } from "lucide-react";
 import LogoOrb from "@/components/LogoOrb";
 import { toast } from "sonner";
 import { ThemeToggle } from "@/components/ThemeToggle";
 import { SwipeCard } from "@/components/SwipeCard";
 import { SwipeCompletionDialog } from "@/components/SwipeCompletionDialog";
 import { SaveNotLearnedDialog } from "@/components/SaveNotLearnedDialog";
 import { Progress } from "@/components/ui/progress";
 
 interface Flashcard {
   id: string;
   term: string;
   definition: string;
   image_url: string | null;
   color: string | null;
   flashcard_type?: string;
   interactive_data?: any;
 }
 
 interface FlashcardSet {
   id: string;
   title: string;
   color: string;
 }
 
 const SwipeStudy = () => {
   const { id } = useParams<{ id: string }>();
   const { user, loading } = useAuth();
   const navigate = useNavigate();
   const [set, setSet] = useState<FlashcardSet | null>(null);
   const [allFlashcards, setAllFlashcards] = useState<Flashcard[]>([]);
   const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
   const [currentIndex, setCurrentIndex] = useState(0);
   const [learnedCards, setLearnedCards] = useState<Flashcard[]>([]);
   const [notLearnedCards, setNotLearnedCards] = useState<Flashcard[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [showCompletion, setShowCompletion] = useState(false);
   const [showSaveDialog, setShowSaveDialog] = useState(false);
   const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
 
   useEffect(() => {
     if (!loading && !user) {
       navigate("/auth");
     }
   }, [user, loading, navigate]);
 
   useEffect(() => {
     if (user && id) {
       fetchData();
     }
   }, [user, id]);
 
   const fetchData = async () => {
     try {
       const [setResult, cardsResult] = await Promise.all([
         supabase.from("flashcard_sets").select("*").eq("id", id).single(),
         supabase.from("flashcards").select("*").eq("set_id", id).order("position", { ascending: true }),
       ]);
 
       if (setResult.error) throw setResult.error;
       if (cardsResult.error) throw cardsResult.error;
 
       const cards = (cardsResult.data || []).map(card => ({
         ...card,
         interactive_data: card.interactive_data as any,
       }));
 
       setSet(setResult.data);
       setAllFlashcards(cards);
       setSessionCards(cards);
     } catch (error: any) {
       toast.error(error.message || "Failed to load study session");
       navigate(`/set/${id}`);
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleSwipe = useCallback((direction: "left" | "right") => {
     if (currentIndex >= sessionCards.length) return;
 
     const currentCard = sessionCards[currentIndex];
     setExitDirection(direction);
 
     setTimeout(() => {
       if (direction === "right") {
         setLearnedCards(prev => [...prev, currentCard]);
       } else {
         setNotLearnedCards(prev => [...prev, currentCard]);
       }
 
       const nextIndex = currentIndex + 1;
       if (nextIndex >= sessionCards.length) {
         setShowCompletion(true);
       }
       setCurrentIndex(nextIndex);
       setExitDirection(null);
     }, 300);
   }, [currentIndex, sessionCards]);
 
   const handleRestart = () => {
     if (notLearnedCards.length === 0) {
       // All cards learned, restart with all cards
       setSessionCards(allFlashcards);
       setCurrentIndex(0);
       setLearnedCards([]);
       setNotLearnedCards([]);
       setShowCompletion(false);
       toast.success("Starting fresh with all cards!");
     } else {
       // Restart with only not learned cards
       setSessionCards(notLearnedCards);
       setCurrentIndex(0);
       setLearnedCards([]);
       setNotLearnedCards([]);
       setShowCompletion(false);
       toast.success(`Reviewing ${notLearnedCards.length} cards you're still learning`);
     }
   };
 
   const handleSaveAsNewSet = () => {
     setShowCompletion(false);
     setShowSaveDialog(true);
   };
 
   const handleSaveComplete = () => {
     setShowSaveDialog(false);
     navigate("/dashboard");
   };
 
   const progressPercentage = sessionCards.length > 0 
     ? ((currentIndex) / sessionCards.length) * 100 
     : 0;
 
   if (loading || isLoading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <div className="text-center space-y-4">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
           <p className="text-muted-foreground">Loading...</p>
         </div>
       </div>
     );
   }
 
   if (!set || sessionCards.length === 0) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <div className="text-center">
           <p className="text-xl text-muted-foreground mb-4">No flashcards to study</p>
           <Link to={`/set/${id}`}>
             <Button>Back to Set</Button>
           </Link>
         </div>
       </div>
     );
   }
 
   const currentCard = sessionCards[currentIndex];
 
   return (
     <div className="min-h-screen bg-background flex flex-col">
       <nav className="border-b">
         <div className="container mx-auto px-4 py-4 flex items-center justify-between">
           <LogoOrb size="md" showWordmark={true} linkTo="/" />
           <ThemeToggle />
         </div>
       </nav>
 
       <main className="flex-1 container mx-auto px-4 py-8 flex flex-col">
         <div className="max-w-xl mx-auto w-full flex-1 flex flex-col">
           {/* Header */}
           <div className="mb-6">
             <Link to={`/set/${id}`}>
               <Button variant="ghost" size="sm" className="mb-2">
                 <ArrowLeft className="h-4 w-4 mr-2" />
                 Back to Set
               </Button>
             </Link>
 
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                 <div
                   className="w-5 h-5 rounded-full"
                   style={{ backgroundColor: set.color }}
                 />
                 <h1 className="text-xl font-bold truncate">{set.title}</h1>
               </div>
               <Button variant="ghost" size="sm" onClick={() => {
                 setSessionCards(allFlashcards);
                 setCurrentIndex(0);
                 setLearnedCards([]);
                 setNotLearnedCards([]);
                 toast.success("Session restarted!");
               }}>
                 <RotateCcw className="h-4 w-4" />
               </Button>
             </div>
 
             {/* Progress Indicator */}
             <div className="space-y-2">
               <div className="flex justify-between text-sm">
                 <span className="text-muted-foreground">
                   Card {Math.min(currentIndex + 1, sessionCards.length)} of {sessionCards.length}
                 </span>
                 <div className="flex gap-4 text-sm">
                   <span className="text-green-600 dark:text-green-400">✓ {learnedCards.length}</span>
                   <span className="text-red-600 dark:text-red-400">✗ {notLearnedCards.length}</span>
                 </div>
               </div>
               <Progress 
                 value={progressPercentage} 
                 className="h-2"
               />
             </div>
           </div>
 
           {/* Swipe Card Area */}
           <div className="flex-1 flex items-center justify-center min-h-[400px] relative">
             {currentCard && currentIndex < sessionCards.length && (
               <SwipeCard
                 key={currentCard.id}
                 card={currentCard}
                 setColor={set.color}
                 onSwipe={handleSwipe}
                 exitDirection={exitDirection}
               />
             )}
           </div>
 
           {/* Action Buttons */}
           {currentIndex < sessionCards.length && (
             <div className="flex justify-center gap-8 mt-6 pb-8">
               <Button
                 size="lg"
                 variant="outline"
                 className="h-16 w-16 rounded-full border-2 border-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                 onClick={() => handleSwipe("left")}
               >
                 <X className="h-8 w-8 text-red-500" />
               </Button>
               <Button
                 size="lg"
                 variant="outline"
                 className="h-16 w-16 rounded-full border-2 border-green-500 hover:bg-green-50 dark:hover:bg-green-950"
                 onClick={() => handleSwipe("right")}
               >
                 <Check className="h-8 w-8 text-green-500" />
               </Button>
             </div>
           )}
         </div>
       </main>
 
       <SwipeCompletionDialog
         open={showCompletion}
         onOpenChange={setShowCompletion}
         learnedCount={learnedCards.length}
         notLearnedCount={notLearnedCards.length}
         onRestart={handleRestart}
         onSaveAsNewSet={handleSaveAsNewSet}
       />
 
       <SaveNotLearnedDialog
         open={showSaveDialog}
         onOpenChange={setShowSaveDialog}
         flashcards={notLearnedCards}
         onSuccess={handleSaveComplete}
       />
     </div>
   );
 };
 
 export default SwipeStudy;