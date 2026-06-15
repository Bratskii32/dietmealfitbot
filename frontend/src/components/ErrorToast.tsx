interface Props {
  message: string;
  onRetry?: () => void;
  onClose: () => void;
}

export function ErrorToast({ message, onRetry, onClose }: Props) {
  return (
    <div className="error-toast">
      <p>{message}</p>
      <div className="error-toast-actions">
        {onRetry && (
          <button type="button" className="error-toast-retry" onClick={onRetry}>
            Повторить
          </button>
        )}
        <button type="button" className="error-toast-close" onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  );
}
