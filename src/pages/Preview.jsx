import { Link, useParams } from 'react-router-dom';
import { getThumbnail } from '../mockApi.js';
import { useEffect, useState } from 'react'

export default function Preview() {
    const { filename } = useParams();

    const [thumbnail, setThumbnail] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);

    useEffect(() => {
        getThumbnail(filename)
        .then((data) => {
            setThumbnail(data);
            setLoading(false)
        })
        .catch((err) => {
            setError(err.message);
            setLoading(false);
        })
    },[]);

    if (error) {
        return <div className="min-h-screen bg-black px-50 grid place-items-center"><p className="font-mono text-red-600">Could not load thumbnail: {error}</p></div>;
    }

    if (loading) {
        return <div className="min-h-screen bg-black px-50 grid place-items-center"><p className="bg-black font-mono text-green-600">Loading thumbnail...</p></div>;
    }

    return (
        <div className="min-h-screen bg-black text-green-600 grid place-items-center px-50 font-mono">
        <h1>Preview: {filename}</h1>
        <img src = {thumbnail} alt = {thumbnail} />
        <p>Tuning controls will go here in a future pair program.</p>
        <Link to="/videos" className="hover:text-red-600">Back to videos</Link>
        </div>
    );
}