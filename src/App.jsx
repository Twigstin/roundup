import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NewTask from './pages/NewTask'
import TaskDetail from './pages/TaskDetail'
import Roster from './pages/Roster'
import RosterDetail from './pages/RosterDetail'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks/new" element={<NewTask />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/roster" element={<Roster />} />
        <Route path="/roster/:id" element={<RosterDetail />} />
      </Route>
    </Routes>
  )
}

export default App