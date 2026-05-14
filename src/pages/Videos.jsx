import { useEffect, useState} from 'react';
import { Link } from 'react-router-dom';
import { getVideos } from '../mockApi.js';

export default function Videos() {
  const [videos, setVideos] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVideos()
      .then((data) => {
        setVideos(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading videos...</p>;
  }

  return (
    <div>
      <h1>Available Videos</h1>
      <ul>
        {videos.map((filename) => (
          <li key={filename}>
            <Link to={`/preview/${filename}`}>{filename}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}