import { useState, useEffect } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faSearch, faDownload } from '@fortawesome/free-solid-svg-icons'
import { getTaskItems, getItemEntries, getEntriesByTask, getStudentsByClassList, getTasks, updateItemEntry, addItemEntry, removeItemEntry } from '../api/index'
import { TaskDetailSkeleton } from '../components/Skeleton'
import Spinner from '../components/Spinner'
import { supabase } from '../api/supabase'

function CourseDetail() {
  const { id, itemId } = useParams()
  const { state } = useLocation()
  const backPath = state?.from || `/tasks/${id}/courses`
  const backLabel = state?.from === `/tasks/${id}` ? 'Back' : 'All courses'

  const [task, setTask] = useState(null)
  const [taskItem, setTaskItem] = useState(null)
  const [itemEntries, setItemEntries] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('total')
  const [pendingPaidIds, setPendingPaidIds] = useState(new Set())
  

  // Export
  const [showExportModal, setShowExportModal] = useState(false)
const [isExportingData, setIsExportingData] = useState(false)
const [exportTitle, setExportTitle] = useState('')
const [exportType, setExportType] = useState('basic') // 'basic' | 'full' | 'custom'
const [customStatusCols, setCustomStatusCols] = useState([]) // ['paid', 'collected']
const [exportSortBy, setExportSortBy] = useState('default') // 'default' | 'az' | 'recent'
const [exportDate, setExportDate] = useState(false)
const [exportSummary, setExportSummary] = useState(false)
const [regNumberFixes, setRegNumberFixes] = useState({})
const [exportBlockedMsg, setExportBlockedMsg] = useState('')
 

  useEffect(() => {
    const init = async () => {
      const [allTasks, allItems] = await Promise.all([
        getTasks(),
        getTaskItems(id)
      ])
      const foundTask = allTasks.find(t => t.id === id)
      const foundItem = allItems.find(i => i.id === itemId)
      if (!foundTask || !foundItem) { setLoading(false); return }

      setTask(foundTask)
      setTaskItem(foundItem)

      const [allItemEntries, taskEntries] = await Promise.all([
  getItemEntries(id),
  getEntriesByTask(id)
])

const studentData = taskEntries
  .filter((e, i, arr) => e.student_id
    ? arr.findIndex(x => x.student_id === e.student_id) === i
    : arr.findIndex(x => !x.student_id && x.student_name === e.student_name) === i
  )
  .map(e => ({ id: e.student_id, name: e.student_name, reg_number: e.student_reg_number }))

setItemEntries(allItemEntries.filter(e => e.task_item_id === itemId))
setStudents(studentData)
      setLoading(false)
    }
    init()
  }, [id, itemId])

  // ─── Derived ───────────────────────────────────────────────────────────────
  //const relevantEntries = itemEntries // already filtered to this itemId
// Match entries to students by student_id first, fall back to student_name
const getEntryForStudent = (student) =>
  itemEntries.find(e =>
    (e.student_id && e.student_id === student.id) ||
    (!e.student_id && e.student_name === student.name)
  )

const paidCount = students.filter(s => !!getEntryForStudent(s)).length
const collectedCount = students.filter(s => {
  const entry = getEntryForStudent(s)
  return entry?.collected
}).length
const notPaidCount = students.length - paidCount
const notCollectedCount = paidCount - collectedCount
const totalCount = students.length



const paidStudentIds = new Set(
  students.filter(s => !!getEntryForStudent(s)).map(s => s.id)
)


  const getAvailableStatuses = () => [
  { key: 'paid', label: 'Paid' },
  { key: 'collected', label: 'Collected' }
]

const openExportModal = () => {
  if (filteredStudents.length === 0) {
    setExportBlockedMsg('⚠️ Nothing to export — your current filter has no students.')
    setTimeout(() => setExportBlockedMsg(''), 3000)
    return
  }

  setExportTitle(taskItem?.name || '')
  const fixes = {}
  filteredStudents.forEach(s => {
    if (!s.reg_number || s.reg_number.trim() === '') fixes[s.id] = ''
  })
  setRegNumberFixes(fixes)
  setShowExportModal(true)
}

  // ─── Optimistic toggle paid ────────────────────────────────────────────────
  const handleTogglePaid = async (student) => {
  const existingEntry = getEntryForStudent(student)

  if (existingEntry) {
    setItemEntries(prev => prev.filter(e => e.id !== existingEntry.id))
    try {
      const { error } = await supabase.from('item_entries').delete().eq('id', existingEntry.id)
      if (error) throw error
    } catch (e) {
      console.error('Failed to remove entry:', e)
      setItemEntries(prev => [...prev, existingEntry])
    }
  } else {
    const newEntry = {
      id: crypto.randomUUID(),
      task_id: id,
      task_item_id: itemId,
      student_id: task?.class_list_id ? student.id : null,
      student_name: student.name,
      student_reg_number: student.reg_number,
      collected: false,
      updated_at: new Date().toISOString()
    }
    setItemEntries(prev => [...prev, newEntry])
    setPendingPaidIds(prev => new Set(prev).add(student.id || student.name))

    try {
      let saved
      try {
        saved = await addItemEntry(newEntry)
      } catch (e) {
        console.error('Insert failed, retrying with null student_id:', e)
        saved = await addItemEntry({ ...newEntry, student_id: null })
      }
      setItemEntries(prev => prev.map(e => e.id === newEntry.id ? saved : e))
    } catch (e2) {
      console.error('Retry also failed:', e2)
      setItemEntries(prev => prev.filter(e => e.id !== newEntry.id))
    } finally {
      setPendingPaidIds(prev => {
        const next = new Set(prev)
        next.delete(student.id || student.name)
        return next
      })
    }
  }
}

  // ─── Optimistic toggle collected ──────────────────────────────────────────
  const handleToggleCollected = async (entry) => {
    const newCollected = !entry.collected
    // Optimistic update
    setItemEntries(prev =>
      prev.map(e => e.id === entry.id ? { ...e, collected: newCollected } : e)
    )
    try {
      await updateItemEntry(entry.id, { collected: newCollected })
    } catch {
      // Rollback
      setItemEntries(prev =>
        prev.map(e => e.id === entry.id ? { ...e, collected: entry.collected } : e)
      )
    }
  }

  // ─── Filter ────────────────────────────────────────────────────────────────
  const filteredStudents = students.filter(student => {
  const matchesSearch =
    student.name.toLowerCase().includes(search.toLowerCase()) ||
    (student.reg_number || '').toLowerCase().includes(search.toLowerCase())

  const entry = getEntryForStudent(student)
  const isPaid = !!entry
  const isCollected = entry?.collected || false

  const matchesFilter =
    activeFilter === 'total' ? true :
    activeFilter === 'paid' ? isPaid :
    activeFilter === 'not_paid' ? !isPaid :
    activeFilter === 'collected' ? isCollected :
    activeFilter === 'not_collected' ? (isPaid && !isCollected) : true

  return matchesSearch && matchesFilter
})

  // ─── Missing data detection ────────────────────────────────────────────────
  const missingRegCount = students.filter(s => !s.reg_number || s.reg_number.trim() === '').length
  const hasMissingData = missingRegCount > 0

  // ─── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
  if (exportType === 'custom' && activeFilter === 'total' && customStatusCols.length === 0) return
 
  setIsExportingData(true)
  setShowExportModal(false)
 
  const XLSX = await import('xlsx-js-style')
 
  // ── Sort ──
  let sortedStudents = [...filteredStudents]
  if (exportSortBy === 'az') {
    sortedStudents.sort((a, b) => a.name.localeCompare(b.name))
  } else if (exportSortBy === 'recent') {
    sortedStudents.sort((a, b) => {
      const ea = itemEntries.find(e => e.student_id === a.id)
      const eb = itemEntries.find(e => e.student_id === b.id)
      const ta = ea?.updated_at ? new Date(ea.updated_at).getTime() : 0
      const tb = eb?.updated_at ? new Date(eb.updated_at).getTime() : 0
      return tb - ta
    })
  }
 
  // ── Columns ──
  const buildColumns = () => {
    const cols = ['S/N', 'Name', 'Reg Number']
    if (exportType === 'basic') return cols
    if (exportType === 'full') return [...cols, 'Paid', 'Collected']
    // custom
    if (activeFilter === 'total') {
      customStatusCols.forEach(key => cols.push(key === 'paid' ? 'Paid' : 'Collected'))
    } else {
      cols.push(activeFilter.replace('_', ' '))
    }
    return cols
  }
 
  const buildRow = (student, index) => {
    const entry = getEntryForStudent(student)
    const isPaid = !!entry
    const isCollected = entry?.collected || false
    const fixedReg = regNumberFixes[student.id]
    const regNumber = fixedReg && fixedReg.trim() !== '' ? fixedReg : (student.reg_number || '')
 
    const row = [index + 1, student.name, regNumber]
 
    if (exportType === 'basic') return row
    if (exportType === 'full') return [...row, isPaid ? '✓' : '', isCollected ? '✓' : '']
 
    if (activeFilter === 'total') {
      customStatusCols.forEach(key => {
        row.push(key === 'paid' ? (isPaid ? '✓' : '') : (isCollected ? '✓' : ''))
      })
    } else {
      const matches =
        activeFilter === 'paid' ? isPaid :
        activeFilter === 'not_paid' ? !isPaid :
        activeFilter === 'collected' ? isCollected :
        activeFilter === 'not_collected' ? (isPaid && !isCollected) : false
      row.push(matches ? '✓' : '')
    }
    return row
  }
 
  const headers = buildColumns()
  const rows = sortedStudents.map((student, index) => buildRow(student, index))
 
  const missingRegNumbers = sortedStudents.filter(s => {
    const fixed = regNumberFixes[s.id]
    const reg = fixed && fixed.trim() !== '' ? fixed : (s.reg_number || '')
    return !reg || reg.trim() === ''
  })
  const hasMissingRegNumbers = missingRegNumbers.length > 0
 
  // ── Assemble sheet with optional title / date / summary blocks ──
  const sheetRows = []
 
  if (exportTitle.trim() !== '') {
    sheetRows.push([exportTitle])
    sheetRows.push([])
  }
  if (exportDate) {
    sheetRows.push([`Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`])
    sheetRows.push([])
  }
 
  const headerRowIndex = sheetRows.length
  sheetRows.push(headers)
  const dataStartRow = sheetRows.length
  rows.forEach(r => sheetRows.push(r))
 
  if (exportSummary) {
    sheetRows.push([])
    sheetRows.push(['Summary'])
    sheetRows.push(['Total', totalCount])
    sheetRows.push(['Paid', paidCount])
    sheetRows.push(['Not paid', notPaidCount])
    sheetRows.push(['Collected', collectedCount])
    sheetRows.push(['Not collected', notCollectedCount])
  }
 
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows)
 
  const headerStyle = {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '111111' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    }
  }
 
  const defaultCellStyle = {
    font: { sz: 10 },
    alignment: { vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'D3D3D3' } },
      bottom: { style: 'thin', color: { rgb: 'D3D3D3' } },
      left: { style: 'thin', color: { rgb: 'D3D3D3' } },
      right: { style: 'thin', color: { rgb: 'D3D3D3' } }
    }
  }
 
  const missingCellStyle = {
    ...defaultCellStyle,
    font: { sz: 10, color: { rgb: 'FF0000' }, italic: true },
    fill: { patternType: 'solid', fgColor: { rgb: 'FFF3F3' } }
  }
 
  for (let C = 0; C < headers.length; C++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: C })
    if (!worksheet[cellRef]) worksheet[cellRef] = { v: headers[C], t: 's' }
    worksheet[cellRef].s = headerStyle
  }
 
  for (let R = 0; R < rows.length; R++) {
    for (let C = 0; C < headers.length; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: dataStartRow + R, c: C })
      if (!worksheet[cellRef]) worksheet[cellRef] = { v: '', t: 's' }
      const isMissingReg = C === 2 && (() => {
        const fixed = regNumberFixes[sortedStudents[R].id]
        const reg = fixed && fixed.trim() !== '' ? fixed : (sortedStudents[R].reg_number || '')
        return !reg || reg.trim() === ''
      })()
      worksheet[cellRef].s = isMissingReg ? missingCellStyle : defaultCellStyle
    }
  }
 
  worksheet['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 15 }]
 
  if (hasMissingRegNumbers) {
    const noteRow = sheetRows.length + 1
    const noteRef = XLSX.utils.encode_cell({ r: noteRow, c: 0 })
    worksheet[noteRef] = {
      v: `Note: ${missingRegNumbers.length} student(s) have missing reg numbers (highlighted in red)`,
      t: 's',
      s: { font: { sz: 9, italic: true, color: { rgb: '888888' } } }
    }
  }
 
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, (taskItem?.name || 'Course').substring(0, 31))
  XLSX.writeFile(workbook, `${(exportTitle || taskItem?.name || 'course').replace(/\s+/g, '_')}_export.xlsx`)
 
  setIsExportingData(false)
}

  if (loading) return <TaskDetailSkeleton />

  if (!task || !taskItem) {
    return (
      <div>
        <div className="page-header">
          <Link to={backPath} className="back-link">
            <FontAwesomeIcon icon={faChevronLeft} /> {backLabel}
          </Link>
        </div>
        <p className="loading-text">Course not found.</p>
      </div>
    )
  }

  const summaryCards = [
    { key: 'total', label: 'Total', value: totalCount, className: '' },
    { key: 'paid', label: 'Paid', value: paidCount, className: 'success' },
    { key: 'not_paid', label: 'Not paid', value: notPaidCount, className: 'danger' },
    { key: 'collected', label: 'Collected', value: collectedCount, className: 'success' },
    { key: 'not_collected', label: 'Not collected', value: notCollectedCount, className: 'warning' },
  ]

  return (
    <div>
      <div className="page-header">
        <Link to={backPath} className="back-link">
          <FontAwesomeIcon icon={faChevronLeft} /> {backLabel}
        </Link>
        <button
          className="task-details-export-btn"
          onClick={openExportModal}
          disabled={isExportingData}
          style={{ fontSize: '13px', padding: '7px 12px' }}
        >
          {isExportingData
  ? <><Spinner size={12} /><span style={{ marginLeft: '6px' }}>Exporting...</span></>
  : <><FontAwesomeIcon icon={faDownload} /> {activeFilter === 'total'
      ? `Export All (${totalCount})`
      : `Export ${activeFilter.replace('_', ' ')} (${filteredStudents.length})`}
    </>}
        </button>
      </div>

      {exportBlockedMsg && (
        <p id="export-no-data-msg-ctn" style={{ marginBottom: '10px' }}>
          <span className='export-no-data-msg'>{exportBlockedMsg}</span>
        </p>
      )}

      {/* Title */}
      <div className="task-details-header" style={{ marginBottom: '20px' }}>
        <div className="title-display-row">
          <h1 className="page-title bold">{taskItem.name}</h1>
          <span className="type-badge type-payment">payment</span>
        </div>
        <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>{task.title}</p>
      </div>

      

      {/* Summary cards */}
      <div className="summary-grid summary-gridy" style={{ marginBottom: '20px' }}>
        {summaryCards.map(card => (
          <div
            key={card.key}
            className={`summary-card ${activeFilter === card.key ? 'summary-card-active' : ''}`}
            onClick={() => setActiveFilter(activeFilter === card.key ? 'total' : card.key)}
          >
            <p className="summary-label">{card.label}</p>
            <p className={`summary-number ${card.className}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="input-wrapper" style={{ marginBottom: '12px' }}>
        <FontAwesomeIcon icon={faSearch} className="input-icon" />
        <input
          className="form-input search-icon"
          type="text"
          placeholder="Search by name or reg number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Student list */}
      <div className="form-card">
        {filteredStudents.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', padding: '24px' }}>
            <p className="empty-title">No students found</p>
            <p className="empty-subtitle">Try a different search or filter</p>
          </div>
        ) : (
          <div className="entry-list">
            {filteredStudents.map(student => {
              const entry = getEntryForStudent(student)
              const isPaid = !!entry
              const isCollected = entry?.collected || false

              return (
                <div key={student.id} className="entry-row-wrapper">
                  <div className="entry-row">
                    <div className="entry-student">
                      <p className="entry-name">{student.name}</p>
                      <p className="entry-reg">{student.reg_number || <span style={{ color: '#c0392b', fontSize: '11px' }}>No reg number</span>}</p>
                    </div>
                    <div className="entry-right">
                      {/* Status badge — updates instantly via optimistic state */}
                      <span className={`status-badge ${
                        isCollected ? 'status-paid' :
                        isPaid ? 'status-part_paid' :
                        'status-not_paid'
                      }`}>
                        {isCollected ? 'Collected' : isPaid ? 'Paid' : 'Not paid'}
                      </span>

                      {/* Mark paid toggle — optimistic, no spinner */}
                      <button
                        className="toggle-btn"
                        onClick={() => handleTogglePaid(student)}
                      >
                        {isPaid ? 'Mark not paid' : 'Mark paid'}
                      </button>

                      {/* Mark collected toggle — only when paid, optimistic */}
                      {(isPaid && !(pendingPaidIds.has(student.id || student.name))) && (
                          <button
                            className={`collected-btn ${isCollected ? 'collected-active' : ''}`}
                            onClick={() => handleToggleCollected(entry)}
                            disabled={pendingPaidIds.has(student.id || student.name)}
                          >
                            {isCollected ? 'Collected ✓' : 'Mark collected'}
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Export modal */}
{showExportModal && (
  <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
    <div className="modal-card" id="modal-card" onClick={(e) => e.stopPropagation()}>
 
      <div style={{ overflowY: 'auto', flex: 1, padding: '24px 24px 0 24px' }}>
        <h2 className="page-title bold" style={{ fontSize: '16px', marginBottom: '16px' }}>Export settings</h2>
 
        <div className="form-field">
          <label className="form-label">List title</label>
          <input
            className="form-input"
            type="text"
            value={exportTitle}
            onChange={(e) => setExportTitle(e.target.value)}
            placeholder="e.g. CSC 301 Assignment 3"
          />
          <span className="form-hint">Appears as a header at the top of the exported file</span>
        </div>
 
        <div className="form-field">
          <label className="form-label">Export type</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
              <input type="radio" name="exportType" checked={exportType === 'basic'} onChange={() => setExportType('basic')} />
              <div>
                <p style={{ margin: 0, fontWeight: '500' }}>Basic</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>S/N, Name, Reg Number only</p>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
              <input type="radio" name="exportType" checked={exportType === 'full'} onChange={() => setExportType('full')} />
              <div>
                <p style={{ margin: 0, fontWeight: '500' }}>Full</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Includes separate Paid and Collected columns</p>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
              <input type="radio" name="exportType" checked={exportType === 'custom'} onChange={() => setExportType('custom')} />
              <div>
                <p style={{ margin: 0, fontWeight: '500' }}>Custom</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Choose which statuses to include as columns</p>
              </div>
            </label>
          </div>
        </div>
 
        {exportType === 'custom' && activeFilter === 'total' && (
          <div className="form-field">
            <label className="form-label">Select status columns</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {getAvailableStatuses().map(s => (
                <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={customStatusCols.includes(s.key)}
                    onChange={(e) => {
                      if (e.target.checked) setCustomStatusCols(prev => [...prev, s.key])
                      else setCustomStatusCols(prev => prev.filter(k => k !== s.key))
                    }}
                  />
                  {s.label}
                </label>
              ))}
            </div>
            {customStatusCols.length === 0 && (
              <p style={{ fontSize: '12px', color: '#b45309', marginTop: '6px' }}>Select at least one status to include</p>
            )}
          </div>
        )}
 
        {exportType === 'custom' && activeFilter !== 'total' && (
          <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px', marginTop: '-8px' }}>
            Will export a ✓ column for <strong>{activeFilter.replace('_', ' ')}</strong> based on your active filter.
          </p>
        )}
 
        <hr style={{ height: '1px', border: 'none', backgroundColor: '#e5e5e5', marginTop: '10px', marginBottom: '10px' }} />
 
        <div className="form-field">
          <label className="form-label">Sort order</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
              <input type="radio" name="sortBy" checked={exportSortBy === 'default'} onChange={() => setExportSortBy('default')} />
              Default order
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
              <input type="radio" name="sortBy" checked={exportSortBy === 'az'} onChange={() => setExportSortBy('az')} />
              A–Z (alphabetical)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
              <input type="radio" name="sortBy" checked={exportSortBy === 'recent'} onChange={() => setExportSortBy('recent')} />
              Recently updated
            </label>
          </div>
        </div>
 
        <hr style={{ height: '1px', border: 'none', backgroundColor: '#e5e5e5', marginTop: '10px', marginBottom: '10px' }} />
 
        <div className="form-field">
          <label className="form-label">Additional header info</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
              <input type="checkbox" checked={exportDate} onChange={(e) => setExportDate(e.target.checked)} />
              Date
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
              <input type="checkbox" checked={exportSummary} onChange={(e) => setExportSummary(e.target.checked)} />
              Summary stats
            </label>
          </div>
        </div>
 
        {Object.keys(regNumberFixes).length > 0 && (
          <div className="form-field">
            <hr style={{ height: '1px', border: 'none', backgroundColor: '#e5e5e5', marginTop: '10px', marginBottom: '10px' }} />
            <label className="form-label" style={{ color: '#b45309' }}>
              ⚠️ {Object.keys(regNumberFixes).length} student{Object.keys(regNumberFixes).length > 1 ? 's have' : ' has'} a missing or invalid reg number
            </label>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>Fix them below (export only) or export anyway.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredStudents
                .filter(s => regNumberFixes.hasOwnProperty(s.id))
                .map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', flex: 1, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.name}
                    </span>
                    <input
                      className="form-input"
                      type="text"
                      style={{ flex: 1, fontSize: '13px', padding: '6px 10px' }}
                      placeholder="Enter reg number"
                      value={regNumberFixes[s.id]}
                      onChange={(e) => setRegNumberFixes(prev => ({ ...prev, [s.id]: e.target.value }))}
                    />
                  </div>
                ))
              }
            </div>
          </div>
        )}
 
        <div style={{ height: '16px' }} />
      </div>
 
      <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e5e5', display: 'flex', gap: '8px', background: '#fff' }}>
        <button
          className="btn-primary"
          style={{
            flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            opacity: exportType === 'custom' && activeFilter === 'total' && customStatusCols.length === 0 ? 0.5 : 1
          }}
          onClick={() => {
            if (exportType === 'custom' && activeFilter === 'total' && customStatusCols.length === 0) return
            handleExport()
          }}
        >
          <FontAwesomeIcon icon={faDownload} /> Export
        </button>
        <button
          className="btn-secondary"
          style={{ flex: 1, padding: '10px' }}
          onClick={() => setShowExportModal(false)}
        >
          Cancel
        </button>
      </div>
 
    </div>
  </div>
)}
    </div>
  )
}

export default CourseDetail