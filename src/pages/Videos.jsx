import { useEffect, useState} from 'react';
import { Link } from 'react-router-dom';
import { getVideos } from '../mockApi.js';

export default function Videos() {
  const [videos, setVideos] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  useEffect(() => {
    getVideos()
      .then((data) => {
        setVideos(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (error) {
    return <p className="font-mono text-red-600">Could not load videos: {error}</p>;
  }

  if (loading) {
    return <p className="font-mono text-green-600">Loading videos...</p>;
  }

  return (
    <div className="min-h-screen bg-black text-green-600 grid place-items-center px-50 font-mono">
      <h1 className="text-2xl">Available Videos</h1>
      <ul className="flex flex-wrap flex-col justify-evenly">
        {videos.map((filename) => (
          <li key={filename} className="hover:text-red-600">
            <Link to={`/preview/${filename}`}>{filename}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}