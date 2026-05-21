import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClassLists, createClassList, deleteClassList, updateClassList } from '../api/index'
import ConfirmModal from '../components/ConfirmModal'
import Spinner from '../components/Spinner'
import { supabase } from '../api/supabase'

function Roster() {
  const [classLists, setClassLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [newListName, setNewListName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [listToDelete, setListToDelete] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [deletingList, setDeletingList] = useState(false)
  
  const navigate = useNavigate()

  const channelId = useRef(`${Date.now()}-${Math.random()}`)


  const sortByUpdated = (lists) => 
  [...lists].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))



  useEffect(() => {
    const fetchClassLists = async () => {
  const lists = await getClassLists()
  
  const listsWithCounts = await Promise.all(
    lists.map(async (list) => {
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('class_list_id', list.id)
      return { ...list, studentCount: count || 0 }
    })
  )
  
  setClassLists(listsWithCounts)
  setLoading(false)
}
    
    fetchClassLists()

    const classListsSub = supabase
      .channel(`class-lists-changes-${channelId.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_lists' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setClassLists(prev => {
            const alreadyExists = prev.some(l => l.id === payload.new.id)
            if (alreadyExists) return prev
            return [...prev, payload.new]
          })
        }
        if (payload.eventType === 'UPDATE') {
  const { count } = supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('class_list_id', payload.new.id)
    
  setClassLists(prev => sortByUpdated(
    prev.map(l => l.id === payload.new.id 
      ? { ...payload.new, studentCount: count || 0 } 
      : l
    )
  ))
}
        if (payload.eventType === 'DELETE') {
          setClassLists(prev => prev.filter(l => l.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(classListsSub)
    }
  }, [])

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      setError('Please enter a list name')
      return
    }
    setCreating(true)
    const saved = await createClassList(newListName.trim())
    setClassLists(prev => sortByUpdated([...prev, { ...saved, studentCount: 0 }]))
    setNewListName('')
    setError('')
    setCreating(false)
  }

  const handleRenameList = async (listId) => {
  if (!editingName.trim()) return
  setRenamingId(listId)
  const updated = await updateClassList(listId, editingName.trim())
  setClassLists(prev => sortByUpdated(prev.map(l =>
    l.id === listId
      ? { ...updated, studentCount: l.studentCount }
      : l
  )))
  setEditingId(null)
  setEditingName('')
  setRenamingId(null)
}

  const handleDeleteClick = (listId) => {
    setListToDelete(listId)
    setShowDeleteWarning(true)
  }

  const handleConfirmDelete = async () => {
    setDeletingList(true)
    await deleteClassList(listToDelete)
    setClassLists(prev => prev.filter(l => l.id !== listToDelete))
    setShowDeleteWarning(false)
    setListToDelete(null)
    setDeletingList(false)
  }

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
        <h1 className="page-title bold">Class lists</h1>
        <span className="roster-count">{classLists.length} list{classLists.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="form-card" style={{ marginBottom: '16px' }}>
        <p className="form-label" style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
          Create new list
        </p>
        {error && <p className="form-error">{error}</p>}
        <div className="roster-align">
          <input
            className="formy-input"
            type="text"
            placeholder="e.g. CSC 301 List, Main Class List…"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateList() }}
          />
          <button
            className="btn-primary"
            onClick={handleCreateList}
            disabled={creating}
            style={{ opacity: creating ? 0.6 : 1, whiteSpace: 'nowrap' }}
          >
            {creating ? (
                  <>
                    <Spinner size={14} /><span style={{ marginLeft: '10px' }}>Creating...</span>
                  </>
                ) : '+ Create list'}
          </button>
        </div>
      </div>

      {classLists.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No class lists yet</p>
          <p className="empty-subtitle">Create your first list to start managing students</p>
        </div>
      ) : (
        <div className="task-list">
          {classLists.map(list => (
            <div key={list.id} className="task-card" onClick={() => navigate(`/roster/${list.id}`)}>
              <div className="task-card-left">
                {editingId === list.id ? (
                  <div
                    className="title-edit-row"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      className="form-input title-edit-input"
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameList(list.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      autoFocus
                    />
                    <button
                      className="btn-primary"
                      style={{ padding: '8px 14px', fontSize: '13px' }}
                      onClick={() => handleRenameList(list.id)}
                    >
                      {renamingId === list.id ? (
                  <>
                    <Spinner size={14} /><span style={{ marginLeft: '10px' }}>Saving...</span>
                  </>
                ) : 'Save'}
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '8px 14px', fontSize: '13px' }}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="task-card-top">
                    <span className="task-card-title light-bold">{list.name}</span>
                  </div>
                )}

                <p className="task-card-meta">
                  {list.studentCount} student{list.studentCount <= 1 ? '' : 's'}
                </p>
              </div>

              <div className="task-card-actions">
                <button
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingId(list.id)
                    setEditingName(list.name)
                  }}
                >
                  Rename
                </button>
                <button
                  className="btn-danger"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteClick(list.id)
                  }}
                >
                  Delete
                </button>
                <span className="task-card-chevron">›</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteWarning && (
  <ConfirmModal
    message="This will permanently delete this class list and all students in it. Tasks that used this list will not be affected. This action cannot be undone."
    onConfirm={handleConfirmDelete}
    onCancel={() => {
      setShowDeleteWarning(false)
      setListToDelete(null)
    }}
    loading={deletingList}
  />
)}
    </div>
  )
}

export default Roster