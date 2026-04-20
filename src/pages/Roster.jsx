import { useState, useEffect, useRef } from 'react'
import { getStudents, createStudent, deleteStudent, bulkCreateStudents } from '../api/index'
import ConfirmModal from '../components/ConfirmModal'

function Roster() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const fileInputRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [showImportWarning, setShowImportWarning] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)

  useEffect(() => {
    const fetchStudents = async () => {
      const data = await getStudents()
      setStudents(data)
      setLoading(false)
    }
    fetchStudents()
  }, [])

  const handleAddStudent = async () => {
    if (!name.trim() || !regNumber.trim()) {
      setError('Both name and reg number are required')
      return
    }

    const newStudent = {
      id: crypto.randomUUID(),
      name: name.trim(),
      regNumber: regNumber.trim()
    }

    await createStudent(newStudent)
    setStudents(prev => [...prev, newStudent])
    setName('')
    setRegNumber('')
    setError('')
  }

  const handleRemove = async (studentId) => {
    await deleteStudent(studentId)
    setStudents(prev => prev.filter(s => s.id !== studentId))
  }

  const handleCSVImport = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  const currentStudents = await getStudents()
  if (currentStudents.length > 0) {
    setPendingFile(file)
    setShowImportWarning(true)
    return
  }

  processCSV(file)
}

const processCSV = (file) => {
  setImporting(true)
  setError('')

  const reader = new FileReader()
  reader.onload = async (event) => {
    const text = event.target.result
    const lines = text.trim().split('\n')
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim())

    const nameIndex = headers.indexOf('name')
    const regIndex = headers.indexOf('regnumber')

    if (nameIndex === -1 || regIndex === -1) {
      setError('CSV must have columns: name, regNumber')
      setImporting(false)
      return
    }

    const newStudents = []

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim())
      if (!cols[nameIndex] || !cols[regIndex]) continue

      newStudents.push({
        id: crypto.randomUUID(),
        name: cols[nameIndex],
        regNumber: cols[regIndex]
      })
    }

    await bulkCreateStudents(newStudents)
    setStudents(prev => [...prev, ...newStudents])
    setImporting(false)
    setError('')
  }

  reader.readAsText(file)
}

const handleConfirmImport = () => {
  setShowImportWarning(false)
  processCSV(pendingFile)
  setPendingFile(null)
}

const handleCancelImport = () => {
  setShowImportWarning(false)
  setPendingFile(null)
  fileInputRef.current.value = ''
}

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.regNumber.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <p className="loading-text">Loading roster...</p>
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title bold">Student roster</h1>
        <span className="roster-count">{students.length} students</span>
      </div>

      <div className="form-card" style={{ marginBottom: '16px' }}>
        <p className="form-label" style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>Add student manually</p>

        {error && <p className="form-error">{error}</p>}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input
            className="form-input"
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="form-input"
            type="text"
            placeholder="Reg number"
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
  className="btn-primary"
  onClick={handleAddStudent}
  disabled={importing}
  style={{ opacity: importing ? 0.6 : 1 }}
>
  Add student
</button>
          <button
  className="btn-secondary"
  onClick={() => !importing && fileInputRef.current.click()}
  disabled={importing}
  style={{ opacity: importing ? 0.6 : 1 }}
>
  {importing ? 'Importing...' : 'Import CSV'}
</button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleCSVImport}
          />
        </div>
      </div>

      <div className="form-card">
        <input
          className="form-input"
          type="text"
          placeholder="Search by name or reg number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: '16px' }}
        />

        {filteredStudents.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', padding: '24px' }}>
            <p className="empty-title">
              {students.length === 0 ? 'No students yet' : 'No results found'}
            </p>
            <p className="empty-subtitle">
              {students.length === 0 ? 'Add students manually or import a CSV' : 'Try a different search'}
            </p>
          </div>
        ) : (
          <div className="student-list">
            <div className="student-list-header">
              <span>Name</span>
              <span>Reg number</span>
              <span></span>
            </div>
            {filteredStudents.map(student => (
              <div key={student.id} className="student-row">
                <span className="student-name">{student.name}</span>
                <span className="student-reg">{student.regNumber}</span>
                <button
                  className="btn-danger"
                  onClick={() => handleRemove(student.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {showImportWarning && (
  <ConfirmModal
    message="Students already exist in your roster. Uploading this file will add to the existing list. Do you want to continue?"
    onConfirm={handleConfirmImport}
    onCancel={handleCancelImport}
  />
)}
    </div>
  )
}

export default Roster