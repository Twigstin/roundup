import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import NewTask from './pages/NewTask'
import TaskDetail from './pages/TaskDetail'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/tasks/new" element={<NewTask />} />
      <Route path="/tasks/:id" element={<TaskDetail />} />
    </Routes>
  )
}

export default App