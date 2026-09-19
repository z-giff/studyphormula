import * as React from "react";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import { continueListOnEnter, promoteDashToBullet, type TextEdit } from "@/lib/listEditing";

/**
 * The editing counterpart to `FlashcardText`: a textarea that turns a typed
 * "- " into a bullet, continues bullet and numbered lists on Enter, and ends
 * the list when Enter is pressed on an empty item.
 *
 * It reports changes through `onValueChange` rather than `onChange`, because
 * the value it produces is not always what the browser put in the field.
 */
interface FlashcardTextareaProps extends Omit<TextareaProps, "onChange" | "value"> {
  value: string;
  onValueChange: (value: string) => void;
}

export const FlashcardTextarea = React.forwardRef<HTMLTextAreaElement, FlashcardTextareaProps>(
  ({ value, onValueChange, onKeyDown, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
    // A caret position to restore after React has re-rendered with our value;
    // setting it during the event would be overwritten by the re-render.
    const pendingCaret = React.useRef<number | null>(null);

    const setRef = (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    };

    React.useLayoutEffect(() => {
      const caret = pendingCaret.current;
      if (caret === null || !innerRef.current) return;
      pendingCaret.current = null;
      innerRef.current.setSelectionRange(caret, caret);
    });

    const apply = (edit: TextEdit) => {
      pendingCaret.current = edit.caret;
      onValueChange(edit.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      // Shift+Enter stays a plain newline, the escape hatch for adding a line
      // inside an item without starting the next one.
      if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;

      const el = e.currentTarget;
      if (el.selectionStart !== el.selectionEnd) return; // a selection: let Enter replace it

      const edit = continueListOnEnter(el.value, el.selectionStart);
      if (!edit) return;
      e.preventDefault();
      apply(edit);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget;
      const edit = promoteDashToBullet(el.value, el.selectionStart);
      if (edit) apply(edit);
      else onValueChange(el.value);
    };

    return (
      <Textarea
        {...props}
        ref={setRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    );
  },
);
FlashcardTextarea.displayName = "FlashcardTextarea";

export default FlashcardTextarea;
