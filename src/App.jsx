import { Routes, Route } from 'react-router-dom'
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
import HowToUse from './pages/HowToUse'

function App() {
  const { needRefresh, updateServiceWorker } = useRegisterSW()
  
  return (
    <>
      {needRefresh[0] && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#111',
          color: '#fff',
          padding: '10px 16px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          zIndex: 200,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <span>Update available</span>
          <button
            onClick={() => updateServiceWorker(true)}
            style={{
              background: '#fff',
              color: '#111',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'inter, sans-serif'
            }}
          >
            Refresh
          </button>
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
        <Route path="/menu" element={<Menu />} />
        <Route path="/about" element={<About />} />
        <Route path="/account" element={<Account />} />
        <Route path="/account/profile" element={<EditProfile />} />
        <Route path="/account/password" element={<ChangePassword />} />
        <Route path="/how-to-use" element={<HowToUse />} />
      </Route>
    </Routes>
    </>
  )
}

export default App