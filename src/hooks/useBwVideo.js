import { useRef, useEffect } from 'react';

// --- WebGL threshold shader (same color-distance mask, but on the GPU) ---
const VERT_SRC = `
attribute vec2 aPosition;
attribute vec2 aTexCoord;
varying vec2 vTexCoord;
void main() {
  vTexCoord = aTexCoord;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAG_SRC = `
precision mediump float;
varying vec2 vTexCoord;
uniform sampler2D uSampler;
uniform vec3 uTargetColor;   // 0-255
uniform float uTolerance;    // 0-255 (matches the CPU version's distance scale)
void main() {
  vec3 c = texture2D(uSampler, vTexCoord).rgb * 255.0;
  float d = distance(c, uTargetColor);
  float v = d <= uTolerance ? 1.0 : 0.0;
  gl_FragColor = vec4(v, v, v, 1.0);
}`;

function compileShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile failed:', gl.getShaderInfoLog(shader));
    }
    return shader;
}

/**
 * Drives the live black & white view.
 *
 * Attach the returned `videoRef` to a <video> (the full-color source) and
 * `canvasRef` to a <canvas>. Every decoded video frame is sampled into a
 * WebGL texture and thresholded against `color` within `tolerance`, so the
 * canvas stays in sync with the video's own timeline (play/pause/seek).
 *
 * @param {string} color      target color as a hex string, e.g. "#ff8800"
 * @param {number} tolerance  match radius in 0-255 color-distance units
 */
export function useBwVideo(color, tolerance) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // keep latest mask params so the long-lived render loop reads fresh values
    const colorRef = useRef(color);
    const toleranceRef = useRef(tolerance);
    useEffect(() => { colorRef.current = color; }, [color]);
    useEffect(() => { toleranceRef.current = tolerance; }, [tolerance]);

    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const gl = canvas.getContext('webgl');
        if (!gl) {
            console.error('WebGL not supported in this browser.');
            return;
        }

        // compile + link the threshold program
        const program = gl.createProgram();
        gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERT_SRC));
        gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Shader link failed:', gl.getProgramInfoLog(program));
            return;
        }
        gl.useProgram(program);

        // full-screen quad: interleaved [x, y, u, v]
        const quad = new Float32Array([
            -1, -1, 0, 0,
             1, -1, 1, 0,
            -1,  1, 0, 1,
             1,  1, 1, 1,
        ]);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

        const aPosition = gl.getAttribLocation(program, 'aPosition');
        const aTexCoord = gl.getAttribLocation(program, 'aTexCoord');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(aTexCoord);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 16, 8);

        // texture that receives each video frame
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        const uSampler = gl.getUniformLocation(program, 'uSampler');
        const uTargetColor = gl.getUniformLocation(program, 'uTargetColor');
        const uTolerance = gl.getUniformLocation(program, 'uTolerance');
        gl.uniform1i(uSampler, 0);

        const drawFrame = () => {
            if (!video.videoWidth) return;
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
            // upload the frame the video is currently showing
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);

            // mask params, read from refs so they're always current
            const hex = colorRef.current;
            gl.uniform3f(
                uTargetColor,
                parseInt(hex.slice(1, 3), 16),
                parseInt(hex.slice(3, 5), 16),
                parseInt(hex.slice(5, 7), 16),
            );
            gl.uniform1f(uTolerance, Number(toleranceRef.current));

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };

        // drive sampling per decoded frame (rVFC), falling back to rAF
        const useRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
        let handle;
        const loop = () => {
            drawFrame();
            handle = useRVFC ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop);
        };
        handle = useRVFC ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop);

        // draw the first frame as soon as there's data, and redraw after a seek,
        // so the B&W view shows something even while paused
        const onSeeked = () => drawFrame();
        const onLoaded = () => drawFrame();
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('loadeddata', onLoaded);

        return () => {
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('loadeddata', onLoaded);
            if (useRVFC) video.cancelVideoFrameCallback(handle);
            else cancelAnimationFrame(handle);
            gl.deleteTexture(texture);
            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);
        };
    }, []);

    return { videoRef, canvasRef };
}
