import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTasks, getEntries, getStudents, updateEntry } from '../api/index'
import Spinner from '../components/Spinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons'

function TaskDetail() {
  const { id } = useParams()
  const [task, setTask] = useState(null)
  const [entries, setEntries] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('total')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [noteText, setNoteText] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const allTasks = await getTasks()
      const foundTask = allTasks.find(t => t.id === id)

      const allEntries = await getEntries(id)
      const allStudents = await getStudents()

      setTask(foundTask)
      setEntries(allEntries)
      setStudents(allStudents)
      setLoading(false)
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
    <div className="loading-container">
      <Spinner size={24} />
    </div>
  )
  }

  const isPayment = task?.type === 'payment'

const total = entries.length

const submittedCount = isPayment
  ? entries.filter(e => e.status === 'paid').length
  : entries.filter(e => e.status === 'submitted').length

const pendingCount = isPayment
  ? entries.filter(e => e.status === 'not_paid').length
  : entries.filter(e => e.status === 'pending').length

const partPaidCount = isPayment
  ? entries.filter(e => e.status === 'part_paid').length
  : 0

  const enrichedEntries = entries.map(entry => {
  const student = students.find(s => s.id === entry.studentId)
  return { ...entry, student }
})

const filteredEntries = enrichedEntries.filter(entry => {
  const matchesSearch =
    entry.student?.name.toLowerCase().includes(search.toLowerCase()) ||
    entry.student?.regNumber.toLowerCase().includes(search.toLowerCase())

  const matchesFilter =
    filter === 'total' ||
    (filter === 'submitted' && entry.status === 'submitted') ||
    (filter === 'pending' && entry.status === 'pending') ||
    (filter === 'paid' && entry.status === 'paid') ||
    (filter === 'part_paid' && entry.status === 'part_paid') ||
    (filter === 'not_paid' && entry.status === 'not_paid')

  return matchesSearch && matchesFilter
})

  if (!task) {
    return <p className="loading-text">Task not found.</p>
  }

const handleStatusUpdate = async (entryId, currentStatus) => {
  let newStatus

  if (isPayment) {
    if (currentStatus === 'not_paid') newStatus = 'part_paid'
    else if (currentStatus === 'part_paid') newStatus = 'paid'
    else newStatus = 'not_paid'
  } else {
    newStatus = currentStatus === 'pending' ? 'submitted' : 'pending'
  }

  await updateEntry(entryId, {
    status: newStatus,
    updatedAt: new Date().toISOString()
  })

  setEntries(prev =>
    prev.map(e => e.id === entryId ? { ...e, status: newStatus } : e)
  )
}

const handleSaveNote = async (entryId) => {
  await updateEntry(entryId, {
    note: noteText,
    updatedAt: new Date().toISOString()
  })

  setEntries(prev =>
    prev.map(e => e.id === entryId ? { ...e, note: noteText } : e)
  )

  setEditingNoteId(null)
  setNoteText('')
}

  return (
  <div>
    <div className="page-header">
      <Link to="/" className="back-link"><FontAwesomeIcon icon={faChevronLeft}/> Back</Link>
    </div>

    <div className="task-detail-header">
      <h1 className="page-title bold">{task.title}</h1>
      <span className={`type-badge type-${task.type}`}>{task.type}</span>
    </div>

    <div className={`summary-grid ${isPayment ? 'summary-grid-4' : 'summary-grid-3'}`}>
  <div
    className={`summary-card ${filter === 'total' ? 'summary-card-active' : ''}`}
    onClick={() => setFilter('total')}
  >
    <p className="summary-label">Total</p>
    <p className="summary-number">{total}</p>
  </div>

  {isPayment ? (
    <>
      <div
        className={`summary-card ${filter === 'paid' ? 'summary-card-active' : ''}`}
        onClick={() => setFilter('paid')}
      >
        <p className="summary-label">Paid</p>
        <p className="summary-number success">{submittedCount}</p>
      </div>
      <div
        className={`summary-card ${filter === 'part_paid' ? 'summary-card-active' : ''}`}
        onClick={() => setFilter('part_paid')}
      >
        <p className="summary-label">Part paid</p>
        <p className="summary-number warning">{partPaidCount}</p>
      </div>
      <div
        className={`summary-card ${filter === 'not_paid' ? 'summary-card-active' : ''}`}
        onClick={() => setFilter('not_paid')}
      >
        <p className="summary-label">Not paid</p>
        <p className="summary-number danger">{pendingCount}</p>
      </div>
    </>
  ) : (
    <>
      <div
        className={`summary-card ${filter === 'submitted' ? 'summary-card-active' : ''}`}
        onClick={() => setFilter('submitted')}
      >
        <p className="summary-label">Submitted</p>
        <p className="summary-number success">{submittedCount}</p>
      </div>
      <div
        className={`summary-card ${filter === 'pending' ? 'summary-card-active' : ''}`}
        onClick={() => setFilter('pending')}
      >
        <p className="summary-label">Pending</p>
        <p className="summary-number warning">{pendingCount}</p>
      </div>
    </>
  )}
</div>

    <div className="toolbar">
  <input
    className="form-input"
    type="text"
    placeholder="Search by name or reg number…"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
</div>

    <div className="form-card">
  {filteredEntries.length === 0 ? (
    <div className="empty-state" style={{ border: 'none', padding: '24px' }}>
      <p className="empty-title">
        {enrichedEntries.length === 0 ? 'No entries yet' : 'No results found'}
      </p>
      <p className="empty-subtitle">
        {enrichedEntries.length === 0
          ? 'Create a new task after adding students to your roster'
          : 'Try a different search or filter'
        }
      </p>
    </div>
  ) : (
    <div className="entry-list">
      {filteredEntries.map(entry => (
        <div key={entry.id} className="entry-row-wrapper">
  <div className="entry-row">
    <div className="entry-student">
      <p className="entry-name">{entry.student?.name}</p>
      <p className="entry-reg">{entry.student?.regNumber}</p>
    </div>
    <div className="entry-right">
      <span className={`status-badge status-${entry.status}`}>
        {entry.status.replace('_', ' ')}
      </span>
      <button
        className="toggle-btn"
        onClick={() => handleStatusUpdate(entry.id, entry.status)}
      >
        {isPayment
          ? entry.status === 'not_paid' ? 'Mark part paid'
            : entry.status === 'part_paid' ? 'Mark paid'
            : 'Mark not paid'
          : entry.status === 'pending' ? 'Mark submitted' : 'Mark pending'
        }
      </button>
    </div>
  </div>

  {entry.note && editingNoteId !== entry.id && (
    <p className="entry-note">{entry.note}</p>
  )}

  {editingNoteId === entry.id ? (
    <div className="note-editor">
      <input
        className="form-input"
        type="text"
        placeholder="Add a note…"
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
      />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button
          className="btn-primary"
          style={{ padding: '6px 14px', fontSize: '13px' }}
          onClick={() => handleSaveNote(entry.id)}
        >
          Save
        </button>
        <button
          className="btn-secondary"
          style={{ padding: '6px 14px', fontSize: '13px' }}
          onClick={() => {
            setEditingNoteId(null)
            setNoteText('')
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  ) : (
    <button
      className="note-btn"
      onClick={() => {
        setEditingNoteId(entry.id)
        setNoteText(entry.note || '')
      }}
    >
      {entry.note ? 'Edit note' : 'Add note'}
    </button>
  )}
</div>
      ))}
    </div>
  )}
</div>
  </div>
)
}

export default TaskDetail