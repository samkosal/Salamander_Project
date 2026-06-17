
import { Link, useParams } from 'react-router-dom';
import { getJobStatus, submitProcessingJob } from '../api.js';
import { useState, useEffect } from 'react';
import { useBwVideo } from '../hooks/useBwVideo.js';

export default function Preview() {
    const { filename } = useParams();
    const [color, setColor] = useState('#ffffff');
    const [tolerance, setTolerance] = useState(0);
    const [jobId, setJobId] = useState(null);
    const [viewMode, setViewMode] = useState('live');

    const { videoRef, canvasRef, overlayRef } = useBwVideo(color, tolerance);

    const handleSubmitJob = async () => {
        const result = await submitProcessingJob(filename, color, tolerance);
        setJobId(result.jobId);
    };

    useEffect(() => {
        if (!jobId) return;
        const id = setInterval(async () => {
            await getJobStatus(jobId);
        }, 1500);
        return () => clearInterval(id);
    }, [jobId]);

    return (
        <div className="min-h-screen bg-black text-green-600 grid place-items-center px-50 font-mono">
            <h1>Preview: {filename}</h1>

            <div className="flex gap-2 mb-4">
                <button onClick={() => setViewMode('thumbnail')} className="px-3 py-1 border border-green-600">
                    Thumbnail
                </button>
                <button onClick={() => setViewMode('live')} className="px-3 py-1 border border-green-600">
                    Live Video
                </button>
            </div>

            {viewMode === 'thumbnail' ? (
                <img src={`/api/thumbnail/${filename}`} alt={filename} className="max-w-md border-2" />
            ) : (
                <div className="flex gap-4 items-start">
                    <div className="flex flex-col items-center gap-1">
                        <span>Color</span>
                        <video ref={videoRef} src={`/videos/${filename}`} controls muted className="max-w-md" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span>Black &amp; White</span>
                        <div className="relative max-w-md">
                            <canvas ref={canvasRef} className="block w-full bg-black border-2" />
                            <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                        </div>
                    </div>
                </div>
            )}

            <label>
                Target color
                <input type="color" value={color} onChange={e => setColor(e.target.value)} />
            </label>

            <label>
                Tolerance: {tolerance}
                <input type="range" min={1} max={60} value={tolerance} onChange={e => setTolerance(e.target.value)} />
            </label>

            <button onClick={handleSubmitJob} className="text-orange-600 hover:text-green-600">
                Submit Job
            </button>

            <Link to="/videos" className="hover:text-red-600">
                Back to videos
            </Link>
        </div>
    );
}

