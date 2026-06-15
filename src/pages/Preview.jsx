import { Link, useParams } from 'react-router-dom';
import { getJobStatus, submitProcessingJob } from '../api.js';
import { useState, useEffect } from 'react';
import { useBwVideo } from '../hooks/useBwVideo.js';

export default function Preview() {
    const { filename } = useParams();

    //state
    const [color, setColor] = useState('#ffffff');
    const [tolerance, setTolerance] = useState(0);
    const [jobId, setJobId] = useState(null);

    // live B&W view + centroid overlay: attach these refs to the elements below
    const { videoRef, canvasRef, overlayRef } = useBwVideo(color, tolerance);

    const handleSubmitJob = async () => {
        const result = await submitProcessingJob(filename, color, tolerance);
        setJobId(result.jobId);
    };

    useEffect(() => {
        if (!jobId) return;

        const id = setInterval(async () => {
            await getJobStatus(jobId);
            // TODO: read progress from the response and update state;
            // if the job is complete or failed, stop polling: clearInterval(id)
        }, 1500);

        // cleanup runs when jobId changes or the component unmounts
        return () => clearInterval(id);
    }, [jobId]);

    return (
        <div className="min-h-screen bg-black text-green-600 grid place-items-center px-50 font-mono">
        <h1>Preview: {filename}</h1>

        {/* color + B&W side by side, both driven by the one <video> so they stay in sync */}
        <div className="flex gap-4 items-start">
            <div className="flex flex-col items-center gap-1">
                <span>Color</span>
                <video
                    ref={videoRef}
                    src={`/videos/${filename}`}
                    controls
                    muted
                    className="max-w-md"
                />
            </div>
            <div className="flex flex-col items-center gap-1">
                <span>Black &amp; White</span>
                {/* the overlay canvas sits on top of the B&W canvas to draw the centroid dot */}
                <div className="relative max-w-md">
                    <canvas ref={canvasRef} className="block w-full bg-black border-2" />
                    <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                </div>
            </div>
        </div>

        <label>Target color <input type="color" onChange={(e) => setColor(e.target.value)} value={color} /></label>
        <label>Tolerance: {tolerance}
            <input type="range" min={1} max={60} onChange={(e) => setTolerance(e.target.value)} value={tolerance} />
        </label>

        <button className="text-orange-600 hover:text-green-600" onClick={handleSubmitJob}>Submit Job</button>

        <Link to="/videos" className="hover:text-red-600">Back to videos</Link>
        </div>
    );
}
