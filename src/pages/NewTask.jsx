import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createTask } from '../api/index'
import { getStudents, createEntry } from '../api/index'

function NewTask() {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('submission')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Please enter a task name')
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

    for (const student of students) {
      await createEntry({
        id: crypto.randomUUID(),
        taskId: newTask.id,
        studentId: student.id,
        status: defaultStatus,
        note: '',
        updatedAt: new Date().toISOString()
      })
    }

    navigate('/')
  }

  return (
    <div>
      <div className="page-header">
        <Link to="/" className="back-link">← Back</Link>
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