import { useEffect, useState } from 'react';
import './LoserReaction.css';

// Tenor GIF embed IDs — all royalty-free meme GIFs via Tenor
const LOSER_MEMES = [
  { id: 'ZJ1Q6bKOSKJMJGnAWi', label: 'Sad Crying' },
  { id: 'H8n1GSNKDWKO0OECof', label: 'Fail' },
  { id: '10UUe8ZsLnaqwo', label: 'Nope' },
  { id: 'xT0xeJpnrWC4XWblEk', label: 'Almost' },
  { id: 'l0MYGb1RuomHQKMPS', label: 'So close' },
  { id: '3oriO0OEd9QIDdllqo', label: 'Crying' },
  { id: '11c3PjdJQfn7rq', label: 'Rage Quit' },
  { id: 'TjCFKmq3ljGSYvkO6q', label: 'Really Bro' },
  { id: 'yWfzMnMRPPG4ow4PLE', label: 'Disapprove' },
  { id: 'a0h7sAqON67nO', label: 'Facepalm' },
];

// Funny loser titles by rank (index 1 = 2nd place, etc.)
const LOSER_TITLES = [
  '🥈 The Almost Champion',
  '🥉 Bronze Is Still Metal… Right?',
  '4️⃣ The Participation Pro',
  '💩 BINGO? More Like BINGO-NO',
  '🐢 Slower Than Dial-Up',
  '🦥 Living In Slow Motion',
  '🪑 The Chair Warmer',
  '👻 Invisible Player Award',
  '🥔 Couch Champion',
  '🎭 Oscar for Best Dramatic Loss',
];

const LOSER_MESSAGES = [
  "So close... yet so far 😢",
  "The numbers just weren't on your side 🎲",
  "Plot twist: You lost 📉",
  "Maybe next round, champ 🐌",
  "The BINGO gods have spoken 🙏",
  "Your card said 'no' 🚫",
  "Technically, you played 🙃",
  "Error 404: Win not found 💻",
  "Keep your head up… and your card down 😭",
  "F in chat 🪦",
];

interface Props {
  rank: number;       // 0-indexed rank among losers (0 = 2nd place)
  winnerName: string;
  visible: boolean;
}

export default function LoserReaction({ rank, winnerName, visible }: Props) {
  const [meme, setMeme] = useState(LOSER_MEMES[0]);
  const [msg, setMsg] = useState(LOSER_MESSAGES[0]);
  const [title, setTitle] = useState(LOSER_TITLES[0]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      const m = LOSER_MEMES[Math.floor(Math.random() * LOSER_MEMES.length)];
      const msgIdx = Math.floor(Math.random() * LOSER_MESSAGES.length);
      const titleIdx = Math.min(rank, LOSER_TITLES.length - 1);
      setMeme(m);
      setMsg(LOSER_MESSAGES[msgIdx]);
      setTitle(LOSER_TITLES[titleIdx]);
      // Stagger entrance slightly for drama
      setTimeout(() => setShow(true), 300);
    } else {
      setShow(false);
    }
  }, [visible, rank]);

  if (!visible) return null;

  return (
    <div className={`loser-reaction ${show ? 'lr-visible' : ''}`}>
      <div className="lr-title">{title}</div>
      <div className="lr-winner-line">
        <span className="lr-winner-badge">🏆 {winnerName} wins!</span>
      </div>
      <div className="lr-gif-wrap">
        <img
          className="lr-gif"
          src={`https://media.tenor.com/images/${meme.id}/tenor.gif`}
          alt={meme.label}
          loading="lazy"
          onError={(e) => {
            // Fallback if Tenor fails: show emoji art
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="lr-gif-fallback">😭💀😂</div>
      </div>
      <div className="lr-message">{msg}</div>
    </div>
  );
}
