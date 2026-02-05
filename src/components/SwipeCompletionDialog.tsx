 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { RotateCcw, Save, Trophy, Target } from "lucide-react";
 
 interface SwipeCompletionDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   learnedCount: number;
   notLearnedCount: number;
   onRestart: () => void;
   onSaveAsNewSet: () => void;
 }
 
 export const SwipeCompletionDialog = ({
   open,
   onOpenChange,
   learnedCount,
   notLearnedCount,
   onRestart,
   onSaveAsNewSet,
 }: SwipeCompletionDialogProps) => {
   const totalCards = learnedCount + notLearnedCount;
   const percentLearned = totalCards > 0 ? Math.round((learnedCount / totalCards) * 100) : 0;
 
   const getMessage = () => {
     if (percentLearned === 100) {
       return {
         emoji: "🎉",
         title: "Perfect Score!",
         description: "You've mastered all the cards! Amazing work!",
       };
     }
     if (percentLearned >= 80) {
       return {
         emoji: "🌟",
         title: "Great Progress!",
         description: "You're almost there! Just a few more to master.",
       };
     }
     if (percentLearned >= 50) {
       return {
         emoji: "💪",
         title: "Keep Going!",
         description: "You're making solid progress. Let's sharpen what needs work!",
       };
     }
     return {
       emoji: "📚",
       title: "Good Start!",
       description: "Every expert was once a beginner. Let's review those cards again!",
     };
   };
 
   const message = getMessage();
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader className="text-center">
           <div className="text-6xl mb-4">{message.emoji}</div>
           <DialogTitle className="text-2xl">{message.title}</DialogTitle>
           <DialogDescription className="text-base">
             {message.description}
           </DialogDescription>
         </DialogHeader>
 
         <div className="py-6">
           <div className="flex justify-center gap-8 mb-6">
             <div className="text-center">
               <div className="flex items-center justify-center gap-2 mb-1">
                 <Trophy className="h-5 w-5 text-green-500" />
                 <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                   {learnedCount}
                 </span>
               </div>
               <p className="text-sm text-muted-foreground">Learned</p>
             </div>
             <div className="text-center">
               <div className="flex items-center justify-center gap-2 mb-1">
                 <Target className="h-5 w-5 text-red-500" />
                 <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                   {notLearnedCount}
                 </span>
               </div>
               <p className="text-sm text-muted-foreground">Still Learning</p>
             </div>
           </div>
 
           <div className="w-full bg-muted rounded-full h-3 mb-2">
             <div
               className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-500 transition-all"
               style={{ width: `${percentLearned}%` }}
             />
           </div>
           <p className="text-center text-sm text-muted-foreground">
             {percentLearned}% mastered
           </p>
         </div>
 
         <div className="flex flex-col gap-3">
           {notLearnedCount > 0 && (
             <Button onClick={onRestart} className="w-full" size="lg">
               <RotateCcw className="h-4 w-4 mr-2" />
               Review {notLearnedCount} Cards Again
             </Button>
           )}
           {notLearnedCount === 0 && (
             <Button onClick={onRestart} className="w-full" size="lg">
               <RotateCcw className="h-4 w-4 mr-2" />
               Start Over With All Cards
             </Button>
           )}
           {notLearnedCount > 0 && (
             <Button onClick={onSaveAsNewSet} variant="outline" className="w-full" size="lg">
               <Save className="h-4 w-4 mr-2" />
               Save "Still Learning" as New Set
             </Button>
           )}
         </div>
       </DialogContent>
     </Dialog>
   );
 };