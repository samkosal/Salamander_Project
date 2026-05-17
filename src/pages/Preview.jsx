import { Link, useParams } from 'react-router-dom';

export default function Preview() {
  const { filename } = useParams();

  return (
    <div className="min-h-screen bg-black text-green-600 grid place-items-center px-50 font-mono">
      <h1>Preview: {filename}</h1>
      <p>Thumbnail and tuning controls will go here in a future pair program.</p>
      <Link to="/videos" className="hover:text-red-600">Back to videos</Link>
    </div>
  );
}