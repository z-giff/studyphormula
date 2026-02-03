import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import LogoOrb from "@/components/LogoOrb";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Flashcard {
  id: string;
  term: string;
  definition: string;
}

interface FlashcardSet {
  id: string;
  title: string;
  color: string;
}

interface QuizQuestion {
  id: string;
  questionText: string;
  correctAnswer: string;
  options: string[];
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const QuizMode = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [set, setSet] = useState<FlashcardSet | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

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
      const [setResult, flashcardsResult] = await Promise.all([
        supabase.from("flashcard_sets").select("*").eq("id", id).single(),
        supabase.from("flashcards").select("id, term, definition").eq("set_id", id).order("position", { ascending: true }),
      ]);

      if (setResult.error) throw setResult.error;
      if (flashcardsResult.error) throw flashcardsResult.error;

      setSet(setResult.data);
      setFlashcards(flashcardsResult.data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load quiz data");
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const questions: QuizQuestion[] = useMemo(() => {
    if (flashcards.length < 4) return [];

    return flashcards.map((card) => {
      const otherCards = flashcards.filter((c) => c.id !== card.id);
      const wrongAnswers = shuffleArray(otherCards)
        .slice(0, 3)
        .map((c) => c.definition);

      const options = shuffleArray([card.definition, ...wrongAnswers]);

      return {
        id: card.id,
        questionText: card.term,
        correctAnswer: card.definition,
        options,
      };
    });
  }, [flashcards]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleComplete = () => {
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions. ${unanswered.length} remaining.`);
      return;
    }
    setIsSubmitted(true);
    const correctCount = questions.filter((q) => answers[q.id] === q.correctAnswer).length;
    toast.success(`Quiz complete! You got ${correctCount}/${questions.length} correct.`);
  };

  const handleRetake = () => {
    setAnswers({});
    setIsSubmitted(false);
  };

  const score = useMemo(() => {
    if (!isSubmitted) return null;
    return questions.filter((q) => answers[q.id] === q.correctAnswer).length;
  }, [isSubmitted, questions, answers]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!set) return null;

  if (flashcards.length < 4) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <LogoOrb size="md" showWordmark={true} linkTo="/" />
            <ThemeToggle />
          </div>
        </nav>
        <main className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Not Enough Flashcards</h1>
          <p className="text-muted-foreground mb-6">
            You need at least 4 flashcards to generate a multiple choice quiz.
          </p>
          <Link to={`/set/${id}`}>
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Set
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b sticky top-0 bg-background/95 backdrop-blur z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <LogoOrb size="md" showWordmark={true} linkTo="/" />
          <ThemeToggle />
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <Link to={`/set/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Set
            </Button>
          </Link>
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 text-sm font-medium mb-3">
            <Crown className="h-4 w-4" />
            Premium Quiz
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">{set.title}</h1>
          <p className="text-muted-foreground mt-2">{questions.length} Questions</p>
          {isSubmitted && score !== null && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary font-semibold text-lg">
              Score: {score}/{questions.length} ({Math.round((score / questions.length) * 100)}%)
            </div>
          )}
        </div>

        <div className="space-y-8">
          {questions.map((question, index) => {
            const userAnswer = answers[question.id];
            const isCorrect = userAnswer === question.correctAnswer;
            const showResult = isSubmitted;

            return (
              <div
                key={question.id}
                className={cn(
                  "p-6 rounded-xl border transition-colors",
                  showResult && isCorrect && "border-green-500/50 bg-green-500/5",
                  showResult && !isCorrect && userAnswer && "border-red-500/50 bg-red-500/5",
                  !showResult && "bg-card"
                )}
              >
                <div className="flex items-start gap-4 mb-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                    {index + 1}
                  </span>
                  <h2 className="text-lg font-semibold leading-relaxed pt-1">{question.questionText}</h2>
                  {showResult && (
                    <div className="ml-auto flex-shrink-0">
                      {isCorrect ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                    </div>
                  )}
                </div>

                <RadioGroup
                  value={userAnswer || ""}
                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                  className="space-y-3 ml-12"
                  disabled={isSubmitted}
                >
                  {question.options.map((option, optIndex) => {
                    const optionLabel = String.fromCharCode(65 + optIndex); // A, B, C, D
                    const isThisCorrect = option === question.correctAnswer;
                    const isThisSelected = userAnswer === option;

                    return (
                      <div
                        key={optIndex}
                        className={cn(
                          "flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer",
                          !isSubmitted && "hover:bg-muted/50",
                          !isSubmitted && isThisSelected && "border-primary bg-primary/5",
                          showResult && isThisCorrect && "border-green-500 bg-green-500/10",
                          showResult && isThisSelected && !isThisCorrect && "border-red-500 bg-red-500/10"
                        )}
                        onClick={() => handleAnswerChange(question.id, option)}
                      >
                        <RadioGroupItem
                          value={option}
                          id={`${question.id}-${optIndex}`}
                          disabled={isSubmitted}
                        />
                        <Label
                          htmlFor={`${question.id}-${optIndex}`}
                          className={cn(
                            "flex-1 cursor-pointer font-normal",
                            isSubmitted && "cursor-default"
                          )}
                        >
                          <span className="font-semibold mr-2">{optionLabel}.</span>
                          {option}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>

                {showResult && !isCorrect && (
                  <p className="mt-3 ml-12 text-sm text-green-600 dark:text-green-400">
                    Correct answer: {question.correctAnswer}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 pb-10 flex justify-end gap-3">
          {isSubmitted ? (
            <>
              <Link to={`/set/${id}`}>
                <Button variant="outline">Back to Set</Button>
              </Link>
              <Button
                onClick={handleRetake}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                Retake Quiz
              </Button>
            </>
          ) : (
            <Button
              onClick={handleComplete}
              size="lg"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8"
            >
              Complete
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default QuizMode;
