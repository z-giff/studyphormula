 import { useState } from "react";
 import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
 import { Card } from "@/components/ui/card";
 import { getContrastColor } from "@/lib/utils";
 import { FlowchartCanvasDisplay } from "@/components/FlowchartCanvasDisplay";
 import { DrawingCanvasDisplay } from "@/components/DrawingCanvasDisplay";
 
 interface SwipeCardProps {
   card: {
     id: string;
     term: string;
     definition: string;
     image_url: string | null;
     color: string | null;
     flashcard_type?: string;
     interactive_data?: any;
   };
   setColor: string;
   onSwipe: (direction: "left" | "right") => void;
   exitDirection: "left" | "right" | null;
 }
 
 export const SwipeCard = ({ card, setColor, onSwipe, exitDirection }: SwipeCardProps) => {
   const [isFlipped, setIsFlipped] = useState(false);
   const x = useMotionValue(0);
   const rotate = useTransform(x, [-200, 200], [-25, 25]);
   const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
 
   const cardColor = card.color || setColor;
   const textColor = getContrastColor(cardColor);
 
   const handleDragEnd = (_: any, info: PanInfo) => {
     const threshold = 100;
     if (info.offset.x > threshold) {
       onSwipe("right");
     } else if (info.offset.x < -threshold) {
       onSwipe("left");
     }
   };
 
   const handleFlip = (e: React.MouseEvent) => {
     // Don't flip if dragging
     if (Math.abs(x.get()) < 10) {
       setIsFlipped(!isFlipped);
     }
   };
 
   const exitX = exitDirection === "left" ? -500 : exitDirection === "right" ? 500 : 0;
 
   const renderContent = () => {
     if (card.flashcard_type === "flowchart" && card.interactive_data) {
       return (
         <div className="w-full h-full flex flex-col p-6">
           {!isFlipped ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center">
               <p className="text-sm uppercase tracking-wide opacity-80 mb-4">Term</p>
               <h2 className="text-2xl font-bold break-words">{card.term}</h2>
               <p className="text-sm opacity-70 mt-8">Tap to reveal flowchart</p>
             </div>
           ) : (
             <div className="flex-1 flex flex-col">
               <p className="text-sm uppercase tracking-wide opacity-80 mb-2 text-center">Flowchart</p>
               <div className="flex-1 bg-white rounded-lg overflow-hidden">
                 <FlowchartCanvasDisplay
                   flowchartData={card.interactive_data}
                   showControls={false}
                   className="h-full"
                 />
               </div>
             </div>
           )}
         </div>
       );
     }
 
     if (card.flashcard_type === "drawing" && card.interactive_data) {
       return (
         <div className="w-full h-full flex flex-col p-6">
           {!isFlipped ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center">
               <p className="text-sm uppercase tracking-wide opacity-80 mb-4">Term</p>
               <h2 className="text-2xl font-bold break-words">{card.term}</h2>
               <p className="text-sm opacity-70 mt-8">Tap to reveal drawing</p>
             </div>
           ) : (
             <div className="flex-1 flex flex-col">
               <p className="text-sm uppercase tracking-wide opacity-80 mb-2 text-center">Drawing</p>
               <div className="flex-1 bg-white rounded-lg overflow-hidden">
                 <DrawingCanvasDisplay drawingData={card.interactive_data} />
               </div>
             </div>
           )}
         </div>
       );
     }
 
     // Standard flashcard
     return (
       <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
         <p className="text-sm uppercase tracking-wide opacity-80 mb-4">
           {isFlipped ? "Definition" : "Term"}
         </p>
         {!isFlipped ? (
           <>
             <h2 className="text-2xl md:text-3xl font-bold break-words">{card.term}</h2>
             <p className="text-sm opacity-70 mt-8">Tap to reveal answer</p>
           </>
         ) : (
           <>
             {card.image_url && (
               <img
                 src={card.image_url}
                 alt={card.term}
                 className="max-h-32 mx-auto rounded-lg object-contain mb-4"
               />
             )}
             <p className="text-xl leading-relaxed whitespace-pre-wrap break-words">
               {card.definition}
             </p>
           </>
         )}
       </div>
     );
   };
 
   return (
     <motion.div
       className="absolute w-full max-w-sm cursor-grab active:cursor-grabbing"
       style={{ x, rotate, opacity }}
       drag="x"
       dragConstraints={{ left: 0, right: 0 }}
       dragElastic={0.7}
       onDragEnd={handleDragEnd}
       animate={{
         x: exitX,
         opacity: exitDirection ? 0 : 1,
         scale: exitDirection ? 0.8 : 1,
       }}
       transition={{ duration: 0.3 }}
       onClick={handleFlip}
     >
       <Card
         className="relative h-[400px] md:h-[450px] border-0 shadow-xl overflow-hidden select-none"
         style={{
           backgroundColor: cardColor,
           color: textColor,
         }}
       >
         {/* Swipe indicators */}
         <motion.div
           className="absolute top-4 left-4 px-3 py-1 rounded-full bg-red-500 text-white font-bold text-sm"
           style={{
             opacity: useTransform(x, [-100, -50, 0], [1, 0.5, 0]),
           }}
         >
           NOT LEARNED
         </motion.div>
         <motion.div
           className="absolute top-4 right-4 px-3 py-1 rounded-full bg-green-500 text-white font-bold text-sm"
           style={{
             opacity: useTransform(x, [0, 50, 100], [0, 0.5, 1]),
           }}
         >
           LEARNED
         </motion.div>
 
         {renderContent()}
       </Card>
     </motion.div>
   );
 };