import { useState, useCallback, useRef } from 'react';
import './EmojiReactions.css';

const REACTIONS = ['😂', '🔥', '😱', '💀', '😤', '🎉', '👀', '🤡'];

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
}

interface Props {
  onSendReaction: (emoji: string) => void;
  incomingReaction: { emoji: string; name: string; id: number } | null;
}

export default function EmojiReactions({ onSendReaction, incomingReaction }: Props) {
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([]);
  const [cooldown, setCooldown] = useState(false);
  const counterRef = useRef(0);

  const spawnFloater = useCallback((emoji: string) => {
    const id = ++counterRef.current;
    const x = 20 + Math.random() * 60; // % from left
    setFloaters(prev => [...prev.slice(-8), { id, emoji, x }]);
    setTimeout(() => {
      setFloaters(prev => prev.filter(f => f.id !== id));
    }, 1800);
  }, []);

  const handleReact = useCallback((emoji: string) => {
    if (cooldown) return;
    setCooldown(true);
    setTimeout(() => setCooldown(false), 1200);
    spawnFloater(emoji);
    onSendReaction(emoji);
  }, [cooldown, spawnFloater, onSendReaction]);

  // Incoming reaction from others
  const lastIncoming = useRef<number>(-1);
  if (incomingReaction && incomingReaction.id !== lastIncoming.current) {
    lastIncoming.current = incomingReaction.id;
    spawnFloater(incomingReaction.emoji);
  }

  return (
    <div className="emoji-reactions">
      {/* Floating emojis */}
      <div className="emoji-floaters" aria-hidden="true">
        {floaters.map(f => (
          <span
            key={f.id}
            className="emoji-floater"
            style={{ left: `${f.x}%` }}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      {/* Reaction buttons */}
      <div className="reaction-bar">
        {REACTIONS.map(emoji => (
          <button
            key={emoji}
            className={`reaction-btn ${cooldown ? 'on-cooldown' : ''}`}
            onClick={() => handleReact(emoji)}
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
