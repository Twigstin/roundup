

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>
            No
          </button>
          <button className="btn-danger-solid" onClick={onConfirm}>
            Yes
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal