import { useState, useCallback, useRef } from 'react';
import './EmojiReactions.css';
import {
  playFaaah,
  playSadViolin,
  playAmoungUs,
  playEmotionalDamage,
  playSpiderMan,
  playMemeFinal,
  playWow,
  playSuspicious,
  playManSnoring,
  playOMG,
  playOMGHellNah,
  playEndCareer,
} from '../utils/sounds';

// 12 emoji reactions — each paired with its mp3 sound
const REACTIONS: { emoji: string; sound: () => void; label: string }[] = [
  { emoji: '😂', sound: playFaaah,           label: 'Faaah'         },
  { emoji: '🎻', sound: playSadViolin,        label: 'Sad Violin'    },
  { emoji: '🕵️', sound: playAmoungUs,        label: 'Among Us'      },
  { emoji: '💢', sound: playEmotionalDamage,  label: 'Emotional Dmg' },
  { emoji: '🦸', sound: playSpiderMan,        label: 'Spider-Man'    },
  { emoji: '🎬', sound: playMemeFinal,        label: 'Meme Final'    },
  { emoji: '🤩', sound: playWow,              label: 'Wow'           },
  { emoji: '👀', sound: playSuspicious,       label: 'Suspicious'    },
  { emoji: '😴', sound: playManSnoring,       label: 'Snoring'       },
  { emoji: '😱', sound: playOMG,              label: 'OMG'           },
  { emoji: '🤬', sound: playOMGHellNah,       label: 'Hell Nah'      },
  { emoji: '💀', sound: playEndCareer,        label: 'End Career'    },
];

// Lookup: emoji string → sound fn
const SOUND_MAP = new Map(REACTIONS.map(r => [r.emoji, r.sound]));

function playReactionSound(emoji: string) {
  SOUND_MAP.get(emoji)?.();
}

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
}

interface Props {
  onSendReaction: (emoji: string) => void;
  incomingReaction: { emoji: string; name: string; id: number } | null;
  reactionLocked: boolean; // global lock — true while a sound is playing for everyone
}

export default function EmojiReactions({ onSendReaction, incomingReaction, reactionLocked }: Props) {
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([]);
  const counterRef = useRef(0);

  const spawnFloater = useCallback((emoji: string) => {
    const id = ++counterRef.current;
    const x = 20 + Math.random() * 60;
    setFloaters(prev => [...prev.slice(-8), { id, emoji, x }]);
    setTimeout(() => {
      setFloaters(prev => prev.filter(f => f.id !== id));
    }, 1800);
  }, []);

  const handleReact = useCallback((emoji: string) => {
    if (reactionLocked) return;
    spawnFloater(emoji);
    playReactionSound(emoji); // instant local playback
    onSendReaction(emoji);    // broadcast via PeerJS → host locks everyone
  }, [reactionLocked, spawnFloater, onSendReaction]);

  // Incoming reaction from other players — spawn floater + play sound locally
  const lastIncoming = useRef<number>(-1);
  if (incomingReaction && incomingReaction.id !== lastIncoming.current) {
    lastIncoming.current = incomingReaction.id;
    spawnFloater(incomingReaction.emoji);
    playReactionSound(incomingReaction.emoji);
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

      {/* Reaction buttons — globally locked while any sound plays */}
      <div className="reaction-bar">
        {REACTIONS.map(({ emoji, label }) => (
          <button
            key={emoji}
            className={`reaction-btn ${reactionLocked ? 'on-cooldown' : ''}`}
            onClick={() => handleReact(emoji)}
            aria-label={`React with ${label}`}
            title={label}
            disabled={reactionLocked}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
