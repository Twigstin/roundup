import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import NewTask from './pages/NewTask'
import TaskDetail from './pages/TaskDetail'
import Roster from './pages/Roster'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/tasks/new" element={<NewTask />} />
      <Route path="/tasks/:id" element={<TaskDetail />} />
      <Route path='/roster' element={<Roster />} />
    </Routes>
  )
}

export default App