import { Link, useParams } from 'react-router-dom';
import { getThumbnail } from '../mockApi.js';

export default function Preview() {
  const { filename } = useParams();

  const Thumbnail = getThumbnail(filename);

  return (
    <div className="min-h-screen bg-black text-green-600 grid place-items-center px-50 font-mono">
      <h1>Preview: {filename}</h1>
      <img src = {Thumbnail} alt = {Thumbnail} />
      <p>Tuning controls will go here in a future pair program.</p>
      <Link to="/videos" className="hover:text-red-600">Back to videos</Link>
    </div>
  );
}