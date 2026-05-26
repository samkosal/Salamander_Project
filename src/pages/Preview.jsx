import { Link, useParams } from 'react-router-dom';
import { getThumbnail } from '../mockApi.js';
import { useRef, useState, useEffect } from 'react';

export default function Preview() {
    const { filename } = useParams();

    //ref
    const canvasRef = useRef(null);
    const imgRef = useRef(null);

    //state
    const [thumbnail, setThumbnail] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [imageReady, setImageReady] = useState(false);
    const [color, setColor] = useState('#ffffff');
    const [tolerance, setTolerance] = useState(0);

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
        <input type="color" onChange={(e) => setColor(e.target.value)} value={color} />
        <input type="range" onChange={(e) => setTolerance(e.target.value)} value={tolerance} />
        <canvas className="bg-white border-2" ref={canvasRef} />
        <p>Tuning controls will go here in a future pair program.</p>
        <Link to="/videos" className="hover:text-red-600">Back to videos</Link>
        </div>
    );
}