import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  HelpCircle,
  Mail,
  MessageSquare,
  FileQuestion,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface HelpSupportSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const faqs = [
  {
    question: "How do I create a flashcard set?",
    answer:
      "Click the 'Create New Set' button on your dashboard. Give your set a title and description, then start adding flashcards with terms and definitions.",
  },
  {
    question: "Can I import flashcards from other apps?",
    answer:
      "Yes! You can import flashcards from CSV or Excel files. Go to your flashcard set and click the import button to upload your file.",
  },
  {
    question: "How do I study my flashcards?",
    answer:
      "Open any flashcard set and click 'Memorize'. You can flip cards, mark them as known or unknown, and track your progress.",
  },
  {
    question: "Can I share my flashcard sets?",
    answer:
      "Sharing features are coming soon! You'll be able to share sets with classmates or make them public.",
  },
  {
    question: "How do I change my study preferences?",
    answer:
      "Go to your profile settings and click on 'Preferences'. You can customize auto-flip timing, animations, and more.",
  },
];

export const HelpSupportSettings = ({
  open,
  onOpenChange,
}: HelpSupportSettingsProps) => {
  const [feedback, setFeedback] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSendFeedback = async () => {
    if (!feedback.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setIsSending(true);
    // Simulate sending feedback
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSending(false);
    setFeedback("");
    toast.success("Thank you for your feedback!");
  };

  const handleContactSupport = () => {
    window.location.href = "mailto:support@phormula.co?subject=Support Request";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Help & Support
          </DialogTitle>
          <DialogDescription>
            Get help, send feedback, or contact our support team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* FAQs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileQuestion className="h-4 w-4" />
              Frequently Asked Questions
            </div>

            <div className="space-y-2">
              {faqs.map((faq, index) => (
                <Collapsible
                  key={index}
                  open={expandedFaq === index}
                  onOpenChange={(isOpen) =>
                    setExpandedFaq(isOpen ? index : null)
                  }
                >
                  <CollapsibleTrigger asChild>
                    <button className="flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm hover:bg-muted/50 transition-colors">
                      <span className="font-medium">{faq.question}</span>
                      {expandedFaq === index ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {faq.answer}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>

          <Separator />

          {/* Send Feedback */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Send Feedback
            </div>

            <div className="space-y-3">
              <Textarea
                placeholder="Tell us what you think or suggest improvements..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleSendFeedback}
                disabled={isSending}
                className="w-full"
              >
                {isSending ? "Sending..." : "Send Feedback"}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Contact Support */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Mail className="h-4 w-4" />
              Contact Support
            </div>

            <Button
              variant="outline"
              onClick={handleContactSupport}
              className="w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Support
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              We typically respond within 24 hours
            </p>
          </div>

          <Separator />

          {/* App Info */}
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>Phormula v1.0.0</p>
            <p>© 2025 Phormula. All rights reserved.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
