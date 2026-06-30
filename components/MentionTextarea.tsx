"use client";

import { useState, useRef, useMemo } from "react";
import getCaretCoordinates from "textarea-caret";
import { useLibrary } from "@/lib/store/library";

interface MentionTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: any) => void;
  onValueChange?: (val: string) => void;
}

export function MentionTextarea({ value, onChange, onValueChange, className, ...props }: MentionTextareaProps) {
  const ingredients = useLibrary((s) => s.ingredients);
  const banks = useLibrary((s) => s.banks);

  // Build a flat mention list from ingredients + bank options
  const elements = useMemo(() => {
    const list: { id: string; type: string; content: string }[] = [];
    ingredients.forEach((ing) => {
      list.push({ id: ing.id, type: ing.category || "ingredient", content: ing.value || ing.name });
    });
    banks.forEach((bank) => {
      (bank.options || []).forEach((opt, i) => {
        list.push({ id: `${bank.id}-${i}`, type: bank.name || bank.category, content: opt });
      });
    });
    return list;
  }, [ingredients, banks]);

  type MentionItem = { id: string; type: string; content: string };

  const [mentionState, setMentionState] = useState<{
    active: boolean;
    query: string;
    index: number;
    top: number;
    left: number;
  }>({ active: false, query: "", index: 0, top: 0, left: 0 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);


  const filteredElements = elements.filter(e => 
    e.content.toLowerCase().includes(mentionState.query.toLowerCase()) || 
    e.type.toLowerCase().includes(mentionState.query.toLowerCase())
  ).slice(0, 10); // show top 10

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState.active) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionState(s => ({ ...s, index: (s.index + 1) % filteredElements.length }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionState(s => ({ ...s, index: (s.index - 1 + filteredElements.length) % filteredElements.length }));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredElements[mentionState.index]) {
          insertMention(filteredElements[mentionState.index]);
        }
      } else if (e.key === "Escape") {
        setMentionState(s => ({ ...s, active: false }));
      }
    }
    props.onKeyDown?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    if (onValueChange) onValueChange(e.target.value);
    
    const val = e.target.value;
    const caret = e.target.selectionStart;
    
    // Look backwards from caret to find @
    const textBeforeCaret = val.slice(0, caret);
    const lastAtMatch = textBeforeCaret.match(/@([\w\s]*)$/);
    
    if (lastAtMatch) {
      const coords = getCaretCoordinates(e.target, caret);
      setMentionState({
        active: true,
        query: lastAtMatch[1],
        index: 0,
        top: coords.top + 20,
        left: coords.left
      });
    } else {
      setMentionState(s => ({ ...s, active: false }));
    }
  };

  const insertMention = (el: MentionItem) => {
    if (!textareaRef.current) return;
    const caret = textareaRef.current.selectionStart;
    const textBeforeCaret = value.slice(0, caret);
    const textAfterCaret = value.slice(caret);
    
    const lastAtIndex = textBeforeCaret.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const newText = textBeforeCaret.slice(0, lastAtIndex) + el.content + textAfterCaret;
      
      // We need to simulate an event or just call the parent
      const fakeEvent = { target: { value: newText } } as any;
      onChange(fakeEvent);
      if (onValueChange) onValueChange(newText);
      
      setMentionState(s => ({ ...s, active: false }));
      
      // Reset focus
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = lastAtIndex + el.content.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  };

  return (
    <div className="relative w-full">
      <textarea
        {...props}
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`${className || ''}`}
      />
      
      {mentionState.active && filteredElements.length > 0 && (
        <div 
          className="absolute z-50 bg-surface border border-border rounded-lg shadow-xl overflow-hidden min-w-[200px]"
          style={{ top: mentionState.top, left: mentionState.left }}
        >
          {filteredElements.map((el, i) => (
            <div 
              key={el.id}
              onClick={() => insertMention(el)}
              className={`px-3 py-2 text-sm cursor-pointer border-b border-border/50 last:border-0 ${i === mentionState.index ? 'bg-primary/20 text-primary' : 'hover:bg-surface2'}`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">{el.type}</div>
              <div>{el.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
