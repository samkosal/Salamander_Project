import { Link, useParams } from 'react-router-dom';
import { getThumbnail, getJobStatus, submitProcessingJob } from '../api.js';
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
    const [jobId, setJobId] = useState(null);

    const handleSubmitJob = async () => {
        const result = await submitProcessingJob(filename, color, tolerance);
        setJobId(result.jobId);
    };

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

    useEffect(() => {
        if (!imageReady) return;
        const img = imgRef.current;
        const canvas = canvasRef.current;
        if (!img || !canvas) return;

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = data.data;

        const targetR = parseInt(color.slice(1, 3), 16);
        const targetG = parseInt(color.slice(3, 5), 16);
        const targetB = parseInt(color.slice(5, 7), 16);

        for (let i = 0; i < px.length; i += 4) {
            const r = px[i];
            const g = px[i + 1];
            const b = px[i + 2];

            const distance = Math.sqrt((r - targetR) * (r - targetR) + (g - targetG) * (g - targetG) + (b - targetB) * (b - targetB));

            const value = distance <= tolerance ? 255 : 0;

            px[i] = value;
            px[i + 1] = value;
            px[i + 2] = value;
        }
        ctx.putImageData(data, 0, 0);
    }, [imageReady, color, tolerance]);

    useEffect(() => {
        if (!jobId) return;

        const id = setInterval(async () => {
            const status = await getJobStatus(jobId);
            // update progress state from the response
            // if the job is complete or failed, stop polling: clearInterval(id)
        }, 1500);

        // cleanup runs when jobId changes or the component unmounts
        return () => clearInterval(id);
    }, [jobId]);

    if (error) {
        return <div className="min-h-screen bg-black px-50 grid place-items-center"><p className="font-mono text-red-600">Could not load thumbnail: {error}</p></div>;
    }

    if (loading) {
        return <div className="min-h-screen bg-black px-50 grid place-items-center"><p className="bg-black font-mono text-green-600">Loading thumbnail...</p></div>;
    }

    return (
        <div className="min-h-screen bg-black text-green-600 grid place-items-center px-50 font-mono">
        <h1>Preview: {filename}</h1>
        <img ref={imgRef} src={thumbnail} alt={filename} onLoad={() => setImageReady(true)}/>
        <input type="color" onChange={(e) => setColor(e.target.value)} value={color} />
        <input type="range" onChange={(e) => setTolerance(e.target.value)} value={tolerance} />
        <canvas className="bg-white border-2" ref={canvasRef} />
        {/* <button className="text-orange-600 hover:text-green-600" onClick={submitProcessingJob(filename, )}>Submit Job</button> */}
        <button className="text-orange-600 hover:text-green-600" onClick={handleSubmitJob}>Submit Job</button>
        <Link to="/videos" className="hover:text-red-600">Back to videos</Link>
        </div>
    );
}