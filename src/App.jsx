import { Routes, Route , Link} from 'react-router-dom';
import Home from './pages/Home.jsx';
import Videos from './pages/Videos.jsx';
import Preview from './pages/Preview.jsx';
import Log from './pages/Log.jsx';
import './index.css'


export default function App() {
  return (
    <div className="bg-green-600 text-black grid place-items-center font-Arial">
      <nav>
        <Link to="/" className="hover:text-red-600">Home</Link>
        {' | '}
        <Link to="/videos" className="hover:text-red-600">Videos</Link>
        {' | '}
        <Link to="/Log" className="hover:text-red-600">Log</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/videos" element={<Videos />} />
        <Route path="/preview/:filename" element={<Preview />} />
        <Route path="/Log" element={<Log />} />
      </Routes>
    </div>
  );
}
