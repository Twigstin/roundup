import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { getStudentsByClassList, createStudent, deleteStudent, bulkCreateStudents, clearAllStudents, updateClassList, updateStudent } from '../api/index'
import ConfirmModal from '../components/ConfirmModal'
import Spinner from '../components/Spinner'
import { RosterDetailSkeleton } from '../components/Skeleton'
import { supabase } from '../api/supabase'
import * as XLSX from 'xlsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faPenToSquare, faFilter, faSearch, faFileImport, faXmark, faTrashCan } from '@fortawesome/free-solid-svg-icons'
import posthog from 'posthog-js'

const isValidRegNumber = (reg) => {
  if (!reg || reg.toString().trim() === '' || reg === '-') return false
  const val = reg.toString().trim()
  const futoPattern = /^\d{10,12}$/
  const otherUniPattern = /^(?:PG\/)?[A-Z0-9]{2,4}[\/\-\.]?[A-Z0-9]{2,4}[\/\-\.]?[A-Z0-9]{2,4}[\/\-\.]?\d{3,6}$/i
  const unnSerialPattern = /^\d{2}\/\d{3,6}$/  // e.g. 23/4530 — YY/serial style
  return futoPattern.test(val) || otherUniPattern.test(val) || unnSerialPattern.test(val)
}

function RosterDetail() {
  const { id } = useParams()
  const { state } = useLocation()
  const backTo = state?.from || '/roster'
  const backLabel = state?.fromLabel || 'Class lists'
  const [showUploadPrompt, setShowUploadPrompt] = useState(state?.showEmptyPrompt || false)
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
  const incompleteStudents = students.filter(s => !isValidRegNumber(s.reg_number))
  const [editingStudentId, setEditingStudentId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editReg, setEditReg] = useState('')
  const [editSerial, setEditSerial] = useState('')
  const [savingStudent, setSavingStudent] = useState(false)
  const [editError, setEditError] = useState('')
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(
  () => sessionStorage.getItem(`incomplete_dismissed_${id}`) === 'true'
)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)

  const channelId = useRef(`${Date.now()}-${Math.random()}`)

  useEffect(() => {
  if (location.state?.showEmptyPrompt) {
    window.history.replaceState({}, document.title)
  }
}, [])

useEffect(() => {
  if (students.length > 0) {
    setShowUploadPrompt(false)
  }
}, [students])

  useEffect(() => {
  if (!error) return
  const timer = setTimeout(() => setError(''), 4000)
  return () => clearTimeout(timer)
}, [error])

useEffect(() => {
  if (showIncompleteOnly && incompleteStudents.length === 0) {
    setShowIncompleteOnly(false)
  }
}, [incompleteStudents, showIncompleteOnly])

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
  setError('')

  if (!name.trim() || !regNumber.trim()) {
    setError('Both name and reg number are required')
    return false
  }

  setAddingStudent(true)

  const newStudent = {
    id: crypto.randomUUID(),
    name: name.trim(),
    reg_number: regNumber.trim(),
    serial_number: serialNumber.trim() || null
  }

  try {
    await createStudent(newStudent, id)
    const updated = await getStudentsByClassList(id)
    setStudents(updated)
    setName('')
    setRegNumber('')
    setSerialNumber('')
    setError('')
    posthog.capture('student_added_manually')
    setAddingStudent(false)
    return true
  } catch (e) {
    setError('Failed to add student. Please try again.')
    console.error(e)
    setAddingStudent(false)
    return false
  }
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

  





const cleanValue = (val) => {
  if (val === null || val === undefined) return ''
  const str = val.toString().trim()
  // Handle scientific notation e.g. 2.0251499644E10
  if (/^\d+\.?\d*[eE]\+?\d+$/.test(str)) {
    return Math.round(parseFloat(str)).toString()
  }
  return str
}

const cleanSerial = (val) => {
  if (val === null || val === undefined) return null
  const str = val.toString().trim()
  // Handle float serials e.g. 1.0, 2.0
  if (/^\d+\.0+$/.test(str)) {
    return Math.floor(parseFloat(str)).toString()
  }
  return str
}

const findHeaderRow = (rows, getCols) => {
  const nameKeywords = ['name', 'names', 'fullname', 'studentname',
    'candidatesname', 'candidatename']
  const regKeywords = ['regno', 'regnumber', 'matric', 'matricno', 'matricnum', 'matricnumber',
    'registrationnumber', 'registrationno']

  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const cols = getCols(rows[i])
    const normalized = cols.map(c =>
      c?.toString().toLowerCase().replace(/[^a-z]/g, '').trim()
    )
    const hasName = normalized.some(h => nameKeywords.includes(h))
    const hasReg = normalized.some(h => regKeywords.includes(h))
    if (hasName && hasReg) return i
  }
  return -1
}

const extractStudents = (rows, getCols) => {
  const headerRowIndex = findHeaderRow(rows, getCols)
  if (headerRowIndex === -1) return null

  const headerCols = getCols(rows[headerRowIndex]).map(c =>
    c?.toString().toLowerCase().replace(/[^a-z]/g, '').trim()
  )

  const nameIndex = headerCols.findIndex(h =>
    ['name', 'names', 'fullname', 'studentname', 'candidatesname', 'candidatename'].includes(h)
  )
  const regIndex = headerCols.findIndex(h =>
    ['regno', 'regnumber', 'matric', 'matricno', 'matricnum', 'matricnumber', 'registrationnumber', 'registrationno'].includes(h)
  )
  const serialIndex = headerCols.findIndex(h =>
    ['sn', 'sno', 'serial', 'serialnumber', 'no', 'number'].includes(h)
  )

  const dataRows = rows.slice(headerRowIndex + 1)
  const valid = []
  const incomplete = []

  for (let i = 0; i < dataRows.length; i++) {
    const cols = getCols(dataRows[i])
    const name = cleanValue(cols[nameIndex])
    const reg = cleanValue(cols[regIndex])
    const serial = serialIndex !== -1 ? cleanSerial(cols[serialIndex]) : null

    if (!name) continue // skip completely empty rows


const isValidSerial = (serial) => {
  if (!serial || serial.toString().trim() === '') return true // absent is fine
  return /^\d+$/.test(serial.toString().trim())
}

const regValid = isValidRegNumber(reg)
const serialValid = isValidSerial(serial)

const student = {
  id: crypto.randomUUID(),
  name,
  reg_number: regValid ? reg : '',
  serial_number: serialValid ? serial : null,
  _issues: [
    ...(!regValid ? ['missing or invalid reg number'] : []),
    ...(!serialValid ? ['missing or invalid serial number'] : [])
  ]
}

if (!regValid || !serialValid) {
  incomplete.push(student)
} else {
  valid.push(student)
}
  }

  return { valid, incomplete }
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

    const result = extractStudents(rows, (row) => row)

    if (!result) {
      setError('File must have a name column and a reg/matric number column')
      setImporting(false)
      return
    }

    if (result.valid.length > 0) {
  const toSave = result.valid.map(({ _issues, ...s }) => s)
  await bulkCreateStudents(toSave, id)
}

    if (result.incomplete.length > 0) {
  const incompleteToSave = result.incomplete.map(({ _issues, ...s }) => s)
  await bulkCreateStudents(incompleteToSave, id)
}
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

    const result = extractStudents(
      lines,
      (line) => line.split(',').map(c => c.trim())
    )

    if (!result) {
      setError('CSV must have a name column and a reg/matric number column')
      setImporting(false)
      return
    }

    if (result.valid.length > 0) {
  const toSave = result.valid.map(({ _issues, ...s }) => s)
  await bulkCreateStudents(toSave, id)
}

    if (result.incomplete.length > 0) {
  const incompleteToSave = result.incomplete.map(({ _issues, ...s }) => s)
  await bulkCreateStudents(incompleteToSave, id)
}

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

  const filteredStudents = sortedStudents.filter(s => {
  const matchesSearch =
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.reg_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.serial_number && s.serial_number.toLowerCase().includes(search.toLowerCase()))

  const matchesFilter = showIncompleteOnly
    ? !isValidRegNumber(s.reg_number)
    : true

  return matchesSearch && matchesFilter
})

  const handleEditClick = (student) => {
  setEditingStudentId(student.id)
  setEditName(student.name)
  setEditReg(student.reg_number || '')
  setEditSerial(student.serial_number || '')
  setEditError('')
}

const handleSaveEdit = async (studentId) => {
  const nameRegex = /^[a-zA-Z\s\-'\.]+$/

  if (!editName.trim()) {
    setEditError('Name is required')
    return
  }
  if (!nameRegex.test(editName.trim())) {
    setEditError('Name contains invalid characters')
    return
  }
  if (editReg.trim() && !isValidRegNumber(editReg.trim())) {
    setEditError('Reg number format is invalid')
    return
  }
  if (editSerial.trim() && !/^\d+$/.test(editSerial.trim())) {
    setEditError('Serial number must be a number')
    return
  }

  setSavingStudent(true)
  const updated = await updateStudent(studentId, {
    name: editName.trim(),
    reg_number: editReg.trim(),
    serial_number: editSerial.trim() || null
  })
  setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...updated } : s))
  setEditingStudentId(null)
  setEditError('')
  setSavingStudent(false)
}

const handleCancelEdit = () => {
  setEditingStudentId(null)
  setEditName('')
  setEditReg('')
  setEditSerial('')
  setEditError('')
}

  if (loading) return <RosterDetailSkeleton />

  return (
    <div>
      {showUploadPrompt && (
  <div className="roster-update-banner">
    <div className="roster-update-text">
      <p className="roster-update-title">Your class list is empty</p>
      <p className="roster-update-subtitle">
        Upload your student list now so Roundup can start tracking them in your task.
      </p>
    </div>
    <div className="roster-update-actions">
      <button
        className="btn-primary"
        style={{ fontSize: '13px', padding: '8px 14px' }}
        onClick={() => {
          setShowUploadPrompt(false)
          fileInputRef.current.click()
        }}
      >
        Import list
      </button>
      <button
        className="btn-secondary"
        style={{ fontSize: '13px', padding: '8px 14px' }}
        onClick={() => setShowUploadPrompt(false)}
      >
        Dismiss
      </button>
    </div>
  </div>
)}
      <div className="page-header">
        <Link to={backTo} state={state?.fromState} className="back-link">
          <FontAwesomeIcon icon={faChevronLeft}/> {backLabel}
        </Link>
        <span className="roster-count">{students.length} student{students.length !== 1 ? 's' : ''}</span>
      </div>

      <h1 className="page-title bold" style={{ marginBottom: '20px' }}>{classListName}</h1>

      <div className="form-card" style={{ marginBottom: '16px' }}>
  <div className="add-students-section">
    <p className="add-students-section-title task-limit-title" style={{ textAlign: 'center' }}>Import a class list</p>
    <p className="add-students-section-desc" style={{ textAlign: 'center' }}>
      Fastest way — upload a CSV or Excel file with all your students' names and reg numbers.
    </p>
    <div className='students-add-btn'>
    <button
      className="btn-primary"
      onClick={() => !importing && fileInputRef.current.click()}
      disabled={importing}
      style={{ opacity: importing ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px'}}
    >
      {importing ? <><Spinner size={14} />Importing...</> : (
        <span><FontAwesomeIcon icon={faFileImport} /> Import list</span>
      )}
    </button>
    </div>
    <input
      ref={fileInputRef}
      accept=".csv, .xlsx, .xls"
      type="file"
      style={{ display: 'none' }}
      onChange={handleFileImport}
    />
  </div>

  <div className="or-divider">
    <span>OR</span>
  </div>

  <div className="add-students-section">
    <p className="add-students-section-title task-limit-title" style={{ textAlign: 'center' }}>Add student manually</p>
    <p className="add-students-section-desc" style={{ textAlign: 'center' }}>For a quick single addition.</p>
    <div className='students-add-btn'>
    <button
      className="btn-secondary"
      onClick={() => setShowAddStudentModal(true)}
    >
      + Add student
    </button>
    </div>
  </div>
</div>

      <div className="form-card">
        <div className="class-list-title">
          <p>Student list</p>
        </div>

{incompleteStudents.length > 0 && !bannerDismissed && (
  <div className="incomplete-import-banner">
    <div className="incomplete-import-banner-text">
      <p className="incomplete-import-banner-title light-bold">
        ⚠️ {incompleteStudents.length} student{incompleteStudents.length !== 1 ? 's' : ''} imported with missing or invalid data
      </p>
      <p className="incomplete-import-banner-sub">
        These students were added but have missing or invalid reg numbers. Use the Edit button to fix them.
      </p>
    </div>
    <div className="incomplete-import-banner-actions">
      <button
        className="btn-primary"
        style={{ fontSize: '13px', padding: '8px 14px', whiteSpace: 'nowrap' }}
        onClick={() => {
          sessionStorage.setItem(`incomplete_dismissed_${id}`, 'true')
          setBannerDismissed(true)
          setShowIncompleteOnly(true)
        }}
      >
        Review {incompleteStudents.length}
      </button>
      <button
        className="btn-secondary"
        style={{ fontSize: '13px', padding: '8px 14px', whiteSpace: 'nowrap' }}
        onClick={() => {
          sessionStorage.setItem(`incomplete_dismissed_${id}`, 'true')
          setBannerDismissed(true)
        }}
      >
        Dismiss
      </button>
    </div>
  </div>
)}

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
            <FontAwesomeIcon icon={faXmark} /> Clear List
        </button>
        </div>
        </div>
        {showIncompleteOnly && (
  <button
    className="incomplete-filter-active"
    onClick={() => setShowIncompleteOnly(false)}
  >
    ⚠️ Showing incomplete only <span className="incomplete-filter-clear">✕ Clear</span>
  </button>
)}
        <div className='classlist-action-btns'>
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
          <div
            className="btn-danger-clear-all"
    id="btn-danger-all-clear">
            <button
              className="btn-danger-clear-all"
              onClick={() => setShowClearWarning(true)}
              disabled={importing}
            >
              <FontAwesomeIcon icon={faXmark} /> Clear List
            </button>
            </div>
        </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', padding: '24px' }}>
            <p className="empty-title">
              {students.length === 0 ? 'No students yet' : 'No results found'}
            </p>
            <p className="empty-subtitle">
              {students.length === 0
                ? 'Import your class list or add students manually'
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
  <div key={student.id} className="student-row-wrapper-edit">
    {editingStudentId === student.id ? (
      <div className="student-edit-form">
        {editError && <p className="form-error" style={{ marginBottom: '8px' }}>{editError}</p>}
        <div className="student-edit-inputs">
          <input
            className="form-input"
            type="text"
            placeholder="Full name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <input
            className="form-input"
            type="text"
            placeholder="Reg number"
            value={editReg}
            onChange={(e) => setEditReg(e.target.value)}
          />
          <input
            className="form-input"
            type="text"
            placeholder="Serial number (optional)"
            value={editSerial}
            onChange={(e) => setEditSerial(e.target.value)}
          />
        </div>
        <div className="student-edit-actions">
          <button
            className="btn-primary"
            style={{ fontSize: '13px', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => handleSaveEdit(student.id)}
            disabled={savingStudent}
          >
            {savingStudent ? <><Spinner size={12} /> Saving...</> : 'Save'}
          </button>
          <button
            className="btn-secondary"
            style={{ fontSize: '13px', padding: '7px 14px' }}
            onClick={handleCancelEdit}
          >
            Cancel
          </button>
        </div>
      </div>
    ) : (
      <div className="student-row">
        <span className="student-serial">{student.serial_number || '—'}</span>
        <div className="student-info">
          <span className="student-name">{student.name}</span>
          <span className="student-reg-num">{student.reg_number || <span style={{ color: '#c0392b', fontSize: '11px' }}>No reg number</span>}</span>
        </div>
        <span className="desktop-only student-reg-desktop">
          {student.reg_number || <span style={{ color: '#c0392b', fontSize: '11px' }}>No reg number</span>}
        </span>
        <div className="student-row-actions">
          <button
            className="btn-edit-student"
            onClick={() => handleEditClick(student)}
          >
            <FontAwesomeIcon icon={faPenToSquare} /> Edit
          </button>
          <button
            className="btn-danger remove-btn"
            onClick={() => handleDeleteClick(student.id)}
          >
            <FontAwesomeIcon icon={faTrashCan} /> Remove
          </button>
        </div>
      </div>
    )}
  </div>
))}
          </div>
        )}
      </div>
      {showAddStudentModal && (
  <div className="modal-overlay" onClick={() => { setShowAddStudentModal(false); setError('') }}>
    <div className="modal-card" id="modal-card" onClick={(e) => e.stopPropagation()}>
      <div style={{ padding: '24px 24px 0 24px' }}>
        <p className="page-title bold" style={{ fontSize: '15px', marginBottom: '4px' }}>
          Add student manually
        </p>
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
          Add this student to your class list.
        </p>

        {error && <p className="form-error">{error}</p>}

        <div className="form-field">
          <label className="form-label">Full name</label>
          <input
            className="form-input"
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label className="form-label">Reg number</label>
          <input
            className="form-input"
            type="text"
            placeholder="Reg number"
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label className="form-label">Serial number <span style={{ color: '#999', fontSize: '12px' }}>(optional)</span></label>
          <input
            className="form-input"
            type="text"
            placeholder="Serial number"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
        </div>
      </div>

      <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e5e5', display: 'flex', gap: '8px', background: '#fff', flexShrink: 0 }}>
        <button
          className="btn-primary"
          style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={async () => {
  const success = await handleAddStudent()
  if (success) setShowAddStudentModal(false)
}}
          disabled={addingStudent}
        >
          {addingStudent ? <><Spinner size={14} /> Adding...</> : 'Add student'}
        </button>
        <button
          className="btn-secondary"
          style={{ flex: 1, padding: '10px' }}
          onClick={() => {
            setShowAddStudentModal(false)
            setError('')
            setName('')
            setRegNumber('')
            setSerialNumber('')
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
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