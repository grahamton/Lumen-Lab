import { Canvas } from './components/Canvas'
import { Controls } from './components/Controls'
import { useAnimator } from './hooks/useAnimator'

function App() {
  useAnimator()

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white">
      <Canvas />
      <Controls />
    </div>
  )
}

export default App
