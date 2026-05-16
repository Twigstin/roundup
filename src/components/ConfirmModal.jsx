import Spinner from './Spinner'

function ConfirmModal({ message, onConfirm, onCancel, loading = false }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            No
          </button>
          <button
            className="btn-danger-solid"
            onClick={onConfirm}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
                  <>
                    <Spinner size={14} /><span style={{ marginLeft: '5px' }}>Please wait...</span>
                  </>
                ) : 'Yes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal