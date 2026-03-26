import './QuitModal.css';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function QuitModal({ onConfirm, onCancel }: Props) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box quit-modal" onClick={e => e.stopPropagation()}>
        <div className="quit-emoji">🚪</div>
        <h2>Quit Game?</h2>
        <p>Are you sure you want to leave? Your progress will be lost.</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>
            ← Stay
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Quit 🚪
          </button>
        </div>
      </div>
    </div>
  );
}
