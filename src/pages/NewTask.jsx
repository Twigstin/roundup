import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createTask, getStudents, bulkCreateEntries } from '../api/index'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons'

function NewTask() {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [rosterEmpty, setRosterEmpty] = useState(false)

  useEffect(() => {
  const checkRoster = async () => {
    const students = await getStudents()
    if (students.length === 0) setRosterEmpty(true)
  }
  checkRoster()
}, [])

  const handleSubmit = async () => {

    if ((!title.trim()) && (type === '')) {
      setError('Please enter a task name and select a task type')
      return
    }
    
    if (!title.trim()) {
      setError('Please enter a task name')
      return
    }

    if (type === '') {
      setError('Please select task type')
      return
    }

    setLoading(true)

    const newTask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      type,
      createdAt: new Date().toISOString()
    }

    await createTask(newTask)

    const students = await getStudents()

    const defaultStatus = type === 'payment' ? 'not_paid' : 'pending'

    const newEntries = students.map(student => ({
  id: crypto.randomUUID(),
  taskId: newTask.id,
  studentId: student.id,
  status: defaultStatus,
  note: '',
  updatedAt: new Date().toISOString()
}))

await bulkCreateEntries(newEntries)

    navigate('/')
  }

  return (
    <div>
      {rosterEmpty && (
  <div className="roster-warning">
    <p className="roster-warning-text">
      Your class list is empty. Add your roster first so students are automatically tracked when you create a task.
    </p>
    <Link to="/roster" className="roster-warning-link">
      Add class list →
    </Link>
  </div>
)}

      <div className="page-header">
        <Link to="/" className="back-link"><FontAwesomeIcon icon={faChevronLeft}/> Back</Link>
      </div>

      <div className="form-card">
        <h1 className="page-title bold" style={{ marginBottom: '24px' }}>New task</h1>

        {error && <p className="form-error">{error}</p>}

        <div className="form-field">
          <label className="form-label">Task name</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Assignment 3, Textbook payment…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Task type</label>
          <select
            className="form-input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Select task type</option>
            <option value="submission">Submission</option>
            <option value="payment">Payment</option>
            <option value="attendance">Attendance</option>
          </select>
          <span className="form-hint">This helps categorize and color-code the task</span>
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', padding: '12px' }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create task'}
        </button>
      </div>
    </div>
  )
}

export default NewTask