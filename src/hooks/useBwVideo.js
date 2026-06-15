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

// --- Centroid finder (from the collaborator's centroid branch) ---
// Treats matched (white) pixels as 1, finds connected blobs via flood fill,
// and returns each blob's size + center. We run it on a small downscaled
// binary grid so it's cheap enough to do every frame.
function buildBinaryImage(px, width, height) {
    const image = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            row.push(px[index] === 255 ? 1 : 0);
        }
        image.push(row);
    }
    return image;
}

function findConnectedGroups(image) {
    const groups = [];
    for (let r = 0; r < image.length; r++) {
        for (let c = 0; c < image[0].length; c++) {
            if (image[r][c] === 1) {
                groups.push(dfs(image, r, c));
            }
        }
    }
    groups.sort((a, b) => b.size - a.size);
    return groups;
}

function dfs(image, startRow, startCol) {
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const stack = [[startRow, startCol]];
    image[startRow][startCol] = 0;

    let size = 0;
    let sumX = 0;
    let sumY = 0;
    while (stack.length > 0) {
        const [r, c] = stack.pop();

        size++;
        sumX += c;
        sumY += r;

        for (const [dr, dc] of directions) {
            const newr = r + dr;
            const newc = c + dc;

            if (newr >= 0 && newr < image.length && newc >= 0 && newc < image[0].length && image[newr][newc] === 1) {
                image[newr][newc] = 0;
                stack.push([newr, newc]);
            }
        }
    }

    return {
        size,
        centroid: {
            x: Math.floor(sumX / size),
            y: Math.floor(sumY / size),
        },
    };
}

/**
 * Drives the live black & white view with a centroid marker.
 *
 * Attach the returned refs:
 *   - `videoRef`   -> a <video> (the full-color source)
 *   - `canvasRef`  -> the <canvas> that shows the B&W (WebGL) result
 *   - `overlayRef` -> a <canvas> layered on top, where the red centroid dot is drawn
 *
 * Every decoded video frame is thresholded against `color` within `tolerance`
 * on the GPU, then the largest matched blob's center is marked with a red dot.
 *
 * @param {string} color      target color as a hex string, e.g. "#ff8800"
 * @param {number} tolerance  match radius in 0-255 color-distance units
 */
export function useBwVideo(color, tolerance) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const overlayRef = useRef(null);

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

        // --- centroid setup: a small offscreen canvas to threshold on the CPU,
        // plus the overlay canvas we draw the red dot onto ---
        const overlay = overlayRef.current;
        const octx = overlay ? overlay.getContext('2d') : null;
        const sampler = document.createElement('canvas');
        const sctx = sampler.getContext('2d', { willReadFrequently: true });
        const SAMPLE_W = 160; // centroid grid width (bigger = more accurate, slower)

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
            const tR = parseInt(hex.slice(1, 3), 16);
            const tG = parseInt(hex.slice(3, 5), 16);
            const tB = parseInt(hex.slice(5, 7), 16);
            const tol = Number(toleranceRef.current);
            gl.uniform3f(uTargetColor, tR, tG, tB);
            gl.uniform1f(uTolerance, tol);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            // --- centroid: threshold a downscaled copy on the CPU, mark largest blob ---
            if (!octx) return;
            if (overlay.width !== canvas.width || overlay.height !== canvas.height) {
                overlay.width = canvas.width;
                overlay.height = canvas.height;
            }
            const sw = SAMPLE_W;
            const sh = Math.max(1, Math.round(video.videoHeight * (sw / video.videoWidth)));
            if (sampler.width !== sw || sampler.height !== sh) {
                sampler.width = sw;
                sampler.height = sh;
            }
            sctx.drawImage(video, 0, 0, sw, sh);
            const small = sctx.getImageData(0, 0, sw, sh);
            const sp = small.data;
            for (let i = 0; i < sp.length; i += 4) {
                const dr = sp[i] - tR, dg = sp[i + 1] - tG, db = sp[i + 2] - tB;
                sp[i] = Math.sqrt(dr * dr + dg * dg + db * db) <= tol ? 255 : 0; // R channel = binary
            }
            const groups = findConnectedGroups(buildBinaryImage(sp, sw, sh));

            octx.clearRect(0, 0, overlay.width, overlay.height);
            if (groups.length > 0) {
                const { x, y } = groups[0].centroid; // largest blob
                const ox = x * (overlay.width / sw);
                const oy = y * (overlay.height / sh);
                const radius = Math.max(5, overlay.width * 0.015);
                octx.fillStyle = 'red';
                octx.beginPath();
                octx.arc(ox, oy, radius, 0, Math.PI * 2);
                octx.fill();
            }
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

    return { videoRef, canvasRef, overlayRef };
}
