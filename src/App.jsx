import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NewTask from './pages/NewTask'
import TaskDetail from './pages/TaskDetail'
import Roster from './pages/Roster'
import RosterDetail from './pages/RosterDetail'
import Menu from './pages/Menu'
import About from './pages/About'
import { useRegisterSW } from 'virtual:pwa-register/react'
import Account from './pages/Account'
import EditProfile from './pages/EditProfile'
import ChangePassword from './pages/ChangePassword'
import TutorialList from './pages/TutorialList'
import TutorialDetail from './pages/TutorialDetail'
import Invite from './pages/Invite'
import Community from './pages/Community'
import Support from './pages/Support'
import CourseStatsList from './pages/CourseStatsList'
import CourseDetail from './pages/CourseDetail'

function App() {
  const { needRefresh, updateServiceWorker } = useRegisterSW()
  /*
  const needRefresh = [true, () => {}]
const updateServiceWorker = () => alert('would refresh here')
*/

  useEffect(() => {
  if (needRefresh[0]) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
  return () => {
    document.body.style.overflow = ''
  }
}, [needRefresh[0]])
  
  return (
    <>
      {needRefresh[0] && (
  <div className="modal-overlay-new-list">
    <div className="modal-card-new-list" id='update-banner' style={{ maxWidth: '400px' }}>
      <div style={{ padding: '28px 24px 20px' }}>
        <p className="page-title bold" style={{ fontSize: '18px', marginBottom: '10px' }}>
          ✨ New updates available
        </p>
        <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6 }}>
          Roundup has been updated with the latest fixes and improvements.
          Tap below to refresh and start using the new version.
        </p>
      </div>
      <div style={{ padding: '0 24px 24px' }}>
        <button
          className="btn-primary"
          style={{ width: '100%', padding: '14px' }}
          onClick={() => updateServiceWorker(true)}
        >
          Update now
        </button>
      </div>
    </div>
  </div>
)}

    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks/new" element={<NewTask />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/roster" element={<Roster />} />
        <Route path="/roster/:id" element={<RosterDetail />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/about" element={<About />} />
        <Route path="/account" element={<Account />} />
        <Route path="/account/profile" element={<EditProfile />} />
        <Route path="/account/password" element={<ChangePassword />} />
        <Route path="/tutorials" element={<TutorialList />} />
        <Route path="/tutorials/:id" element={<TutorialDetail />} />
        <Route path="/invite" element={<Invite />} />
        <Route path="/community" element={<Community />} />
        <Route path="/support" element={<Support />} />
        <Route path="/tasks/:id/courses" element={<CourseStatsList />} />
        <Route path="/tasks/:id/courses/:itemId" element={<CourseDetail />} />
      </Route>
    </Routes>
    </>
  )
}

export default App