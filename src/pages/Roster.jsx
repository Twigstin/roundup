import { useState, useEffect, useRef } from 'react'
import { getStudents, createStudent, deleteStudent, bulkCreateStudents, clearAllStudents } from '../api/index'
import ConfirmModal from '../components/ConfirmModal'
import Spinner from '../components/Spinner'
import { supabase } from '../api/supabase'

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
  const [showClearWarning, setShowClearWarning] = useState(false)
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState(null)
  const [addingStudent, setAddingStudent] = useState(false)

  useEffect(() => {
    const fetchStudents = async () => {
      const data = await getStudents()
      setStudents(data)
      setLoading(false)
    }
    fetchStudents()

    const studentsSub = supabase
      .channel('students-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setStudents(prev => [...prev, payload.new])
        }
        if (payload.eventType === 'UPDATE') {
          setStudents(prev => prev.map(s => s.id === payload.new.id ? payload.new : s))
        }
        if (payload.eventType === 'DELETE') {
          setStudents(prev => prev.filter(s => s.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(studentsSub)
    }
  }, [])

  const handleAddStudent = async () => {
  if (!name.trim() || !regNumber.trim()) {
    setError('Both name and reg number are required')
    return
  }

  setAddingStudent(true)

  const newStudent = {
    id: crypto.randomUUID(),
    name: name.trim(),
    reg_number: regNumber.trim()
  }

  const saved = await createStudent(newStudent)
  setStudents(prev => [...prev, saved])
  setName('')
  setRegNumber('')
  setError('')
  setAddingStudent(false)
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
        reg_number: cols[regIndex]
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

const handleClearAll = async () => {
  await clearAllStudents()
  setStudents([])
  setShowClearWarning(false)
}

const handleDeleteClick = (studentId) => {
  setStudentToDelete(studentId)
  setShowDeleteWarning(true)
}

const handleConfirmDelete = async () => {
  await deleteStudent(studentToDelete)
  setStudents(prev => prev.filter(s => s.id !== studentToDelete))
  setShowDeleteWarning(false)
  setStudentToDelete(null)
}

const handleCancelDelete = () => {
  setShowDeleteWarning(false)
  setStudentToDelete(null)
}

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.reg_number.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
    <div className="loading-container">
      <Spinner size={24} />
    </div>
  )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title bold">Student roster</h1>
        <span className="roster-count">{students.length} student{students.length > 1 ? "s" : ""}</span>
      </div>

      <div className="form-card" style={{ marginBottom: '16px' }}>
        <p className="form-label" style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>Add student manually</p>

        {error && <p className="form-error">{error}</p>}

        <div className='form-input-ctn' id="form-input-ctn">
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
  disabled={addingStudent || importing}
  style={{ 
    opacity: addingStudent || importing ? 0.6 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}
>
  {addingStudent ? (
    <>
      <Spinner size={14} />
      Adding...
    </>
  ) : 'Add student'}
</button>
          <button
  className="btn-secondary"
  onClick={() => !importing && fileInputRef.current.click()}
  disabled={importing}
  style={{ opacity: importing ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
>
  {importing ? (
    <>
      <Spinner size={14} />
      Importing...
    </>
  ) : 'Import CSV'}
</button>
          <input
            ref={fileInputRef}
            accept=".csv"
            type="file"
            style={{ display: 'none' }}
            onChange={handleCSVImport}
          />

          {students.length > 0 && (
            <div
            className="btn-danger-clear-all"
    id="btn-danger-all-clear">
  <button
    onClick={() => setShowClearWarning(true)}
    disabled={importing}
  >
    Clear all
  </button>
  </div>
)}
      </div>

      <div className="form-card">
        <div className="class-list-title">
          <p>Class List</p>
        </div>
        <div id="manage-class-list">
        <input
          className="form-input-search"
          type="text"
          placeholder="Search by name or reg number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {students.length > 0 && (
  <button
    className="btn-danger-clear-my-all"
    id="btn-danger-clear-all"
    onClick={() => setShowClearWarning(true)}
    disabled={importing}
  >
    Clear all
  </button>
)}
        </div>

        
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
            <div className="student-list-header" id="student-list-header">
              <span>Name</span>
              <span>Reg number</span>
              <span></span>
            </div>
            {filteredStudents.map(student => (
              <div key={student.id} className="student-row">
                <div id='student-row-arr'>
                <span className="student-name">{student.name}</span>
                <span className="student-reg first">{student.reg_number}</span>
                </div>

                <span className="student-reg mid">{student.reg_number}</span>

                <div className='remove-name-btn'>
                <button
                  className="btn-danger"
                  onClick={() => handleDeleteClick(student.id)}
                >
                  Remove
                </button>
                </div>
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
{showClearWarning && (
  <ConfirmModal
    message="This will permanently delete all students from your roster. This action cannot be undone. Do you want to continue?"
    onConfirm={handleClearAll}
    onCancel={() => setShowClearWarning(false)}
  />
)}
{showDeleteWarning && (
  <ConfirmModal
    message="Are you sure you want to remove this student from the class list? This won't affect existing task entries."
    onConfirm={handleConfirmDelete}
    onCancel={handleCancelDelete}
  />
)}
    </div>
  </div>
  )
}

export default Roster