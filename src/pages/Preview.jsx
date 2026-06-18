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
    const [jobStatus, setJobStatus] = useState(null); // latest /status response
    const [jobError, setJobError] = useState(null);   // submit/polling error

    // live B&W view + centroid overlay: attach these refs to the elements below
    const { videoRef, canvasRef, overlayRef } = useBwVideo(color, tolerance);

    const handleSubmitJob = async () => {
        setJobStatus(null);
        setJobError(null);
        try {
            const result = await submitProcessingJob(filename, color, tolerance);
            setJobId(result.jobId);
        } catch (err) {
            setJobError(err.message);
        }
    };

    useEffect(() => {
        if (!jobId) return;

        let cancelled = false;
        const id = setInterval(async () => {
            try {
                const data = await getJobStatus(jobId);
                if (cancelled) return;
                setJobStatus(data);

                // stop polling once the job reaches a terminal state
                const s = (data.status || '').toLowerCase();
                if (['complete', 'completed', 'done', 'failed', 'error'].includes(s)) {
                    clearInterval(id);
                }
            } catch (err) {
                // a failed request shouldn't spam forever — report it and stop
                if (cancelled) return;
                setJobError(err.message);
                clearInterval(id);
            }
        }, 1500);

        // cleanup runs when jobId changes or the component unmounts
        return () => {
            cancelled = true;
            clearInterval(id);
        };
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

        {/* job feedback: error, in-progress, or final status + result link */}
        {jobError ? (
            <p className="text-red-600">Job error: {jobError}</p>
        ) : jobId && !jobStatus ? (
            <p>Submitting…</p>
        ) : jobStatus ? (
            <p>
                Status: {jobStatus.status}
                {jobStatus.csvUrl && (
                    <> — <a href={jobStatus.csvUrl} target="_blank" rel="noreferrer" className="text-orange-600 hover:text-green-600">download results</a></>
                )}
            </p>
        ) : null}

        <Link to="/videos" className="hover:text-red-600">Back to videos</Link>
        </div>
    );
}
