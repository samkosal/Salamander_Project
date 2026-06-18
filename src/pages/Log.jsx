import { useEffect, useState } from "react";
import { getLog } from "../api";

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
    });
}

export default function Log() {
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadLogs() {
            try {
                const data = await getLog();
                setLogs(data);
            } catch (err) {
                setError(err.message);
            }
        }

        loadLogs();
    }, []);

    return (
        <div className="min-h-screen bg-black text-white grid place-items-center px-30">
            <h1 className="text-3xl font-bold text-green-600">Job Logs</h1>

            {error && (
                <p className="text-red-500">{error}</p>
            )}

            {logs.length === 0 && !error ? (
                <p>No logs found.</p>
            ) : (
                <div className="space-y-4">
                    {logs.map((log) => (
                        <div
                            key={log.jobId}
                            className="border border-gray-700 rounded p-4 text-green-600"
                        >
                            <p><strong>Job ID:</strong> {log.jobId}</p>
                            <p><strong>File:</strong> {log.filename}</p>
                            <p><strong>Status:</strong> {log.status}</p>
                            <p>
                                <strong>Submitted:</strong>{" "}
                                {formatTimestamp(log.submittedAt)}
                            </p>

                            {log.completedAt && (
                                <p>
                                    <strong>Completed:</strong>{" "}
                                    {formatTimestamp(log.completedAt)}
                                </p>
                            )}

                            {log.result && (
                                <p><strong>Result:</strong> {log.result}</p>
                            )}

                            {log.error && (
                                <p><strong>Error:</strong> {log.error}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}