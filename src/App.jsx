import { Canvas } from './components/Canvas'
import { Controls } from './components/Controls'
import { useAnimator } from './hooks/useAnimator'

function App() {
  useAnimator()

  return (
    <div className="w-full h-screen bg-neutral-900 overflow-hidden relative">
      <Canvas />
      <Controls />
    </div>
  )
}

export default App
