import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getStudentsByClassList, createStudent, deleteStudent, bulkCreateStudents, clearAllStudents, updateClassList } from '../api/index'
import ConfirmModal from '../components/ConfirmModal'
import Spinner from '../components/Spinner'
import { supabase } from '../api/supabase'
import * as XLSX from 'xlsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faFilter, faSearch, faFileImport, faXmark, faTrashCan } from '@fortawesome/free-solid-svg-icons'


function RosterDetail() {
  const { id } = useParams()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('serial')
  const [classListName, setClassListName] = useState('')
  const fileInputRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [showImportWarning, setShowImportWarning] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [showClearWarning, setShowClearWarning] = useState(false)
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState(null)
  const [addingStudent, setAddingStudent] = useState(false)
  const [clearingStudents, setClearingStudents] = useState(false)
  const [removingStudent, setRemovingStudent] = useState(false)

  const channelId = useRef(`${Date.now()}-${Math.random()}`)

  useEffect(() => {
  if (!error) return
  const timer = setTimeout(() => setError(''), 4000)
  return () => clearTimeout(timer)
}, [error])

  useEffect(() => {
    const fetchData = async () => {
      const [studentsData, classListData] = await Promise.all([
        getStudentsByClassList(id),
        supabase.from('class_lists').select('name').eq('id', id).single()
      ])
      setStudents(studentsData)
      setClassListName(classListData.data?.name || 'Class list')
      setLoading(false)
    }
    fetchData()

    const studentsSub = supabase
      .channel(`students-changes-${channelId.current}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'students',
        filter: `class_list_id=eq.${id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setStudents(prev => {
            const alreadyExists = prev.some(s => s.id === payload.new.id)
            if (alreadyExists) return prev
            return [...prev, payload.new]
          })
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
  }, [id])

  const handleAddStudent = async () => {
  if (!name.trim() || !regNumber.trim()) {
    setError('Both name and reg number are required')
    return
  }

  setAddingStudent(true)

  const newStudent = {
    id: crypto.randomUUID(),
    name: name.trim(),
    reg_number: regNumber.trim(),
    serial_number: serialNumber.trim() || null
  }

  await createStudent(newStudent, id)
  const updated = await getStudentsByClassList(id)
  setStudents(updated)
  setName('')
  setRegNumber('')
  setSerialNumber('')
  setError('')
  setAddingStudent(false)
}

  const handleFileImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (students.length > 0) {
      setPendingFile(file)
      setShowImportWarning(true)
      return
    }

    processFile(file)
  }

  const processFile = (file) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    if (isExcel) {
      processExcel(file)
    } else {
      processCSV(file)
    }
  }

  const extractStudents = (headers, rows, getCols) => {
    const nameIndex = headers.findIndex(h =>
      ['name', 'names', 'fullname', 'studentname', 'full name',
       'student name', "candidate's name", 'candidates name', 'candidatename'].includes(h)
    )
    const regIndex = headers.findIndex(h =>
      ['regnumber', 'reg number', 'reg_number', 'matric', 'matricnumber',
       'matric number', 'matric_number', 'registrationnumber', 'registration number',
       'registrationno', 'registration no'].includes(h)
    )
    const serialIndex = headers.findIndex(h =>
      ['s/n', 'sn', 'serial', 'serialnumber', 'serial number',
       'serial_number', 'no', 'number', 's.n'].includes(h)
    )

    if (nameIndex === -1 || regIndex === -1) return null

    const newStudents = []
    for (let i = 0; i < rows.length; i++) {
      const cols = getCols(rows[i])
      if (!cols[nameIndex] || !cols[regIndex]) continue
      newStudents.push({
        id: crypto.randomUUID(),
        name: cols[nameIndex].toString().trim(),
        reg_number: cols[regIndex].toString().trim(),
        serial_number: serialIndex !== -1 && cols[serialIndex]
          ? cols[serialIndex].toString().trim()
          : null
      })
    }
    return newStudents
  }

  const processExcel = (file) => {
    setImporting(true)
    setError('')

    const reader = new FileReader()
    reader.onload = async (event) => {
      const data = new Uint8Array(event.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

      if (rows.length < 2) {
        setError('File appears to be empty')
        setImporting(false)
        return
      }

      const headers = rows[0].map(h =>
        h?.toString().toLowerCase().trim().replace(/\s+/g, ' ')
      )

      const newStudents = extractStudents(headers, rows.slice(1), (row) => row)

      if (!newStudents) {
        setError('File must have a name column and a reg/matric number column')
        setImporting(false)
        return
      }

      await bulkCreateStudents(newStudents, id)
      setImporting(false)
      setError('')
    }

    reader.readAsArrayBuffer(file)
  }

  const processCSV = (file) => {
    setImporting(true)
    setError('')

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target.result
      const lines = text.trim().split('\n')
      const headers = lines[0].toLowerCase().split(',').map(h =>
        h.trim().replace(/\s+/g, ' ')
      )

      const newStudents = extractStudents(
        headers,
        lines.slice(1),
        (line) => line.split(',').map(c => c.trim())
      )

      if (!newStudents) {
        setError('CSV must have a name column and a reg/matric number column')
        setImporting(false)
        return
      }

      await bulkCreateStudents(newStudents, id)
      setImporting(false)
      setError('')
    }

    reader.readAsText(file)
  }

  const handleConfirmImport = () => {
    setShowImportWarning(false)
    processFile(pendingFile)
    setPendingFile(null)
  }

  const handleCancelImport = () => {
    setShowImportWarning(false)
    setPendingFile(null)
    fileInputRef.current.value = ''
  }

  const handleClearAll = async () => {
    setClearingStudents(true)
    const userId = (await supabase.auth.getSession()).data.session?.user?.id
    await supabase.from('students').delete().eq('class_list_id', id).eq('user_id', userId)
    setStudents([])
    setShowClearWarning(false)
    setClearingStudents(false)
  }

  const handleDeleteClick = (studentId) => {
    setStudentToDelete(studentId)
    setShowDeleteWarning(true)
  }

  const handleConfirmDelete = async () => {
    setRemovingStudent(true)
    await deleteStudent(studentToDelete)
    setStudents(prev => prev.filter(s => s.id !== studentToDelete))
    setShowDeleteWarning(false)
    setStudentToDelete(null)
    setRemovingStudent(false)
  }

  const sortedStudents = [...students].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'serial') {
      const aNum = parseInt(a.serial_number) || 0
      const bNum = parseInt(b.serial_number) || 0
      return aNum - bNum
    }
    return 0
  })

  const filteredStudents = sortedStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.reg_number.toLowerCase().includes(search.toLowerCase()) ||
    (s.serial_number && s.serial_number.toLowerCase().includes(search.toLowerCase()))
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
        <Link to="/roster" className="back-link"><FontAwesomeIcon icon={faChevronLeft}/> Class lists</Link>
        <span className="roster-count">{students.length} student{students.length !== 1 ? 's' : ''}</span>
      </div>

      <h1 className="page-title bold" style={{ marginBottom: '20px' }}>{classListName}</h1>

      <div className="form-card" style={{ marginBottom: '16px' }}>
        <p className="form-label" style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
          Add student manually
        </p>

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
          <input
            className="form-input"
            type="text"
            placeholder="Serial number (optional)"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
        </div>

        <div className="roster-action-btns">
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
            {addingStudent ? <><Spinner size={14} />Adding...</> : '+ Add student'}
          </button>
          <button
            className="btn-secondary"
            id='import-btn'
            onClick={() => !importing && fileInputRef.current.click()}
            disabled={importing}
            style={{ opacity: importing ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {importing ? <><Spinner size={14} />Importing...</> : (
              <span><FontAwesomeIcon icon={faFileImport} /> Import list</span>
            )}
          </button>
          <input
            ref={fileInputRef}
            accept=".csv, .xlsx, .xls"
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileImport}
          />
          {students.length > 0 && (
            <div
            className="btn-danger-clear-all"
    id="btn-danger-all-clear">
            <button
              className="btn-danger-clear-all"
              onClick={() => setShowClearWarning(true)}
              disabled={importing}
            >
              <FontAwesomeIcon icon={faXmark} /> Clear all
            </button>
            </div>
          )}
        </div>
      </div>

      <div className="form-card">
        <div className="class-list-title">
          <p>Student list</p>
        </div>

        <div id="manage-class-list">
            <div id='list-row-align'>

              
           <div id="input-wrapper">
                   <FontAwesomeIcon icon={faSearch} className="input-icon" />
                   <input
                     className="form-input-search search-icon"
            type="text"
            placeholder="Search by name, reg or serial…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
                   />
                 </div>
          <div id="btn-danger-clear-all-div">
          <button
            className="btn-danger-clear-my-all"
            id="btn-danger-clear-all"
            onClick={() => setShowClearWarning(true)}
            disabled={importing}
          >
            <FontAwesomeIcon icon={faXmark} /> Clear all
        </button>
        </div>
        </div>
          <label className='list-details-filter'><span style={{ marginRight: "5px" }}>Sort by:</span>
            <select
            className="filter-input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: 'auto', fontSize: '13px' }}
          >
            <option value="serial"><FontAwesomeIcon icon={faFilter} />Serial no.</option>
            <option value="name"><FontAwesomeIcon icon={faFilter} />A–Z</option>            
          </select>
          </label>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', padding: '24px' }}>
            <p className="empty-title">
              {students.length === 0 ? 'No students yet' : 'No results found'}
            </p>
            <p className="empty-subtitle">
              {students.length === 0
                ? 'Add students manually or import a file'
                : 'Try a different search'}
            </p>
          </div>
        ) : (
          <div className="student-list">
            <div className="student-list-header">
  <span>S/N</span>
  <span>Name</span>
  <span className="desktop-only">Reg number</span>
  <span></span>
</div>
            {filteredStudents.map(student => (
              <div key={student.id} className="student-row">
    <span className="student-serial">{student.serial_number || '—'}</span>
    <div className="student-info">
      <span className="student-name">{student.name}</span>
      <span className="student-reg-num">{student.reg_number}</span>
    </div>
    <span className="desktop-only student-reg-desktop">{student.reg_number}</span>
    <button className="btn-danger remove-btn" onClick={() => handleDeleteClick(student.id)}>
      <FontAwesomeIcon icon={faTrashCan} /> Remove
    </button>
  </div>
            ))}
          </div>
        )}
      </div>

      {showImportWarning && (
        <ConfirmModal
          message="Students already exist in this list. Uploading will add to the existing list. Do you want to continue?"
          onConfirm={handleConfirmImport}
          onCancel={handleCancelImport}
        />
      )}
      {showClearWarning && (
        <ConfirmModal
          message="This will permanently delete all students from this list. This action cannot be undone."
          onConfirm={handleClearAll}
          onCancel={() => {
            setShowClearWarning(false)
            setClearingStudents(false)
          }}
          loading={clearingStudents}
        />
      )}
      {showDeleteWarning && (
        <ConfirmModal
          message="Are you sure you want to remove this student? This won't affect existing task entries."
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setShowDeleteWarning(false)
            setStudentToDelete(null)
            setRemovingStudent(false)
          }}
          loading={removingStudent}
        />
      )}
    </div>
  )
}

export default RosterDetail