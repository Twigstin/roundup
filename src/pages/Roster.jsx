import { useState, useEffect } from 'react'
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
  const navigate = useNavigate()

  useEffect(() => {
    const fetchClassLists = async () => {
      const data = await getClassLists()
      setClassLists(data)
      setLoading(false)
    }
    fetchClassLists()

    const classListsSub = supabase
      .channel('class-lists-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_lists' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setClassLists(prev => {
            const alreadyExists = prev.some(l => l.id === payload.new.id)
            if (alreadyExists) return prev
            return [...prev, payload.new]
          })
        }
        if (payload.eventType === 'UPDATE') {
          setClassLists(prev => prev.map(l => l.id === payload.new.id ? payload.new : l))
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
    setClassLists(prev => [...prev, saved])
    setNewListName('')
    setError('')
    setCreating(false)
  }

  const handleRenameList = async (listId) => {
    if (!editingName.trim()) return
    const updated = await updateClassList(listId, editingName.trim())
    setClassLists(prev => prev.map(l => l.id === listId ? updated : l))
    setEditingId(null)
    setEditingName('')
  }

  const handleDeleteClick = (listId) => {
    setListToDelete(listId)
    setShowDeleteWarning(true)
  }

  const handleConfirmDelete = async () => {
    await deleteClassList(listToDelete)
    setClassLists(prev => prev.filter(l => l.id !== listToDelete))
    setShowDeleteWarning(false)
    setListToDelete(null)
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
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            className="form-input"
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
            {creating ? 'Creating...' : '+ Create list'}
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
                      Save
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
        />
      )}
    </div>
  )
}

export default Roster