import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { EMAIL_PATTERN, errorMessage, MAX_SHARE_RECIPIENTS, type ShareItemType } from "@/lib/sharing";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: ShareItemType;
  itemId: string;
  itemTitle: string;
}

// Keys that finish an address and turn it into a chip
const SEPARATOR_KEYS = new Set(["Enter", ",", ";", " ", "Tab"]);

const listPeople = (emails: string[]) =>
  emails.length === 1 ? emails[0] : emails.length === 2 ? `${emails[0]} and ${emails[1]}` : `${emails.length} people`;

export function ShareDialog({ open, onOpenChange, itemType, itemId, itemTitle }: ShareDialogProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setEmails([]);
      setDraft("");
      setError(null);
    }
  }, [open]);

  // Add every address in `text`. Anything that isn't an address stays in the
  // box with a message. Returns the full list, or null if something was wrong.
  const addAddresses = (text: string): string[] | null => {
    const parts = text
      .split(/[\s,;]+/)
      .map((part) => part.replace(/^[<("']+|[>)"']+$/g, "").toLowerCase())
      .filter(Boolean);
    const invalid = parts.filter((part) => !EMAIL_PATTERN.test(part));
    const next = [...emails];
    for (const part of parts) {
      if (EMAIL_PATTERN.test(part) && !next.includes(part)) next.push(part);
    }

    if (next.length > MAX_SHARE_RECIPIENTS) {
      setError(`You can share with up to ${MAX_SHARE_RECIPIENTS} people at a time`);
      return null;
    }

    setEmails(next);
    setDraft(invalid.join(" "));
    setError(invalid.length ? `"${invalid[0]}" isn't an email address` : null);
    return invalid.length ? null : next;
  };

  const removeAddress = (email: string) => {
    setEmails((prev) => prev.filter((e) => e !== email));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (SEPARATOR_KEYS.has(e.key) && draft.trim()) {
      e.preventDefault();
      addAddresses(draft);
    } else if (e.key === "Enter") {
      e.preventDefault();
      void handleShare();
    } else if (e.key === "Backspace" && !draft && emails.length) {
      setEmails((prev) => prev.slice(0, -1));
    }
  };

  // A pasted list ("Sam Lee <sam@example.com>, ali@example.com") becomes chips
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const found = e.clipboardData.getData("text").match(/[^\s,;<>()"']+@[^\s,;<>()"']+/g);
    if (!found) return;
    e.preventDefault();
    addAddresses([draft, ...found].join(" "));
  };

  const handleShare = async () => {
    const recipients = draft.trim() ? addAddresses(draft) : emails;
    if (!recipients) return;
    if (recipients.length === 0) {
      setError("Add at least one email address");
      inputRef.current?.focus();
      return;
    }

    setIsSending(true);
    try {
      const { data, error: shareError } = await supabase.rpc("share_flashcards", {
        p_item_type: itemType,
        p_item_id: itemId,
        p_emails: recipients,
      });
      if (shareError) throw shareError;

      const withStatus = (status: string) => (data ?? []).filter((r) => r.status === status).map((r) => r.email);
      const shared = withStatus("shared");
      const alreadyShared = withStatus("already_shared");
      const notes = [
        alreadyShared.length &&
          `${listPeople(alreadyShared)} ${alreadyShared.length === 1 ? "already has" : "already have"} it.`,
        withStatus("self").length && "You can't share with yourself.",
        withStatus("invalid").length && `${listPeople(withStatus("invalid"))} isn't a valid address.`,
      ].filter(Boolean) as string[];

      if (shared.length === 0) {
        setError(notes.join(" ") || "Nothing was shared");
        return;
      }

      toast.success(`Shared with ${listPeople(shared)}`, {
        description: notes.length ? notes.join(" ") : undefined,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to share"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Share {itemType === "file" ? "file" : "set"}</DialogTitle>
          <DialogDescription>
            {itemType === "file"
              ? `Everyone you add gets "${itemTitle}" and every set in it.`
              : `Everyone you add gets a copy of "${itemTitle}".`}{" "}
            People who aren't on Phormula yet get an email invite.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="share-emails">Email addresses</Label>
          <div
            className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
            onClick={() => inputRef.current?.focus()}
          >
            {emails.map((email) => (
              <span
                key={email}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary py-1 pl-2.5 pr-1 text-xs font-medium text-foreground"
              >
                <span className="truncate">{email}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAddress(email);
                  }}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  aria-label={`Remove ${email}`}
                  disabled={isSending}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              id="share-emails"
              type="text"
              inputMode="email"
              autoComplete="off"
              autoFocus
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onBlur={() => draft.trim() && addAddresses(draft)}
              placeholder={emails.length ? "Add another" : "name@example.com"}
              className="h-7 min-w-[10rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
              disabled={isSending}
              aria-invalid={!!error}
              aria-describedby="share-emails-hint"
            />
          </div>
          {error ? (
            <p id="share-emails-hint" className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : (
            <p id="share-emails-hint" className="text-xs text-muted-foreground">
              Press Enter or comma after each address, or paste a list. Up to {MAX_SHARE_RECIPIENTS} at a time.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleShare} disabled={isSending || (!emails.length && !draft.trim())}>
            <Send className="mr-2 h-4 w-4" />
            {isSending
              ? "Sharing..."
              : emails.length > 1
                ? `Share with ${emails.length} people`
                : "Share"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
