import React, { useEffect, useRef, useState } from 'react';

/**
 * WindRippleBackground
 * --------------------
 * Fixed full-viewport WebGL ambient breeze background for the NativeBazar Landing Page.
 *
 * Key properties:
 * 1. Designed to sit inside a `fixed inset-0 -z-50 w-screen h-screen` root container on `LandingPage.tsx`,
 *    remaining permanently fixed across the viewport while glassmorphic content panels scroll smoothly over it.
 * 2. Remains active for the entire lifetime of `LandingPage` (pausing only when the browser tab is hidden)
 *    and disposes all WebGL resources cleanly when navigating away from the landing page.
 * 3. Uses large-scale 2D Simplex Noise (`snoise`) FBM driven purely by `uTime` to create a slow-motion,
 *    continuous breeze over the close-up paddy field (ধানখেত).
 * 4. Gracefully degrades to the static `bg-cover bg-center` paddy image on mobile devices.
 */

export interface WindRippleBackgroundProps {
  src: string;
  /** Optional ref to the host container. */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** Retained for prop compatibility. */
  resolution?: number;
  /** Retained for prop compatibility. */
  dropRadius?: number;
  /** Subtle ambient wind sway amplitude. Default: 0.009 */
  perturbation?: number;
  /** Retained for prop compatibility (effect is 100% autonomous). */
  interactive?: boolean;
  /** Tailwind classes for the ambient tint overlay above the paddy field. */
  overlayClassName?: string;
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  // Map clip-space (-1..1) to top-left origin UV (0..1) matching top-down image rows
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform vec2 uCover;     // UV scale for background-size: cover (includes overscan margin)
uniform float uTime;
uniform float uStrength;
uniform float uAspect;

// Ashima 2D Simplex Noise — smooth, isotropic, C2-continuous gradient noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,
    0.366025403784439,
   -0.577350269189626,
    0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Large-scale 2-octave Simplex FBM for broad, slow-motion wind swells
float windFbm(vec2 p) {
  float f = 0.0;
  f += 0.70 * snoise(p);
  f += 0.30 * snoise(p * 1.85 + vec2(4.2, 1.7));
  return f;
}

void main() {
  // Low spatial frequency (1.35x across the screen) so broad swathes of rice plants lean smoothly together
  vec2 fieldCoord = vec2(vUv.x * max(1.0, uAspect * 0.55), vUv.y) * 1.35;

  // Single slow-motion breeze flowing steadily from left to right-upward
  vec2 windFlow = vec2(uTime * 0.18, -uTime * 0.05);

  float gustPrimary   = windFbm(fieldCoord - windFlow);
  float gustSecondary = snoise(fieldCoord * 0.85 - windFlow * 0.75 + vec2(7.1, 3.4));
  float breezeSwell   = gustPrimary * 0.65 + gustSecondary * 0.35;

  // Horizontal-dominant stalk sway
  vec2 windDisplacement = vec2(
    breezeSwell * 1.0 + 0.25 * sin(fieldCoord.x * 1.8 - uTime * 0.55),
    breezeSwell * 0.18
  );

  // Emulate background-size: cover with built-in overscan so edges never stretch or clip
  vec2 coverUv = (vUv - 0.5) * uCover + 0.5;
  vec2 finalUv = clamp(coverUv - windDisplacement * uStrength, 0.001, 0.999);

  vec3 col = texture2D(uImage, finalUv).rgb;

  // Subtle sunlit wave sheen gliding across the paddy canopy as the breeze passes
  float sunlitCrest = smoothstep(-0.4, 0.8, breezeSwell) - 0.35;
  col += vec3(0.88, 1.0, 0.60) * (sunlitCrest * 0.055);

  gl_FragColor = vec4(col, 1.0);
}`;

export function shouldEnableWindRipple(): boolean {
  if (typeof window === 'undefined') return false;
  const isMobileUa =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobileUa) return false;

  const isSmallScreen = window.innerWidth < 768;
  const hasFinePointer = window.matchMedia?.('(any-pointer: fine)').matches ?? true;
  if (isSmallScreen && !hasFinePointer) return false;

  return true;
}

export const WindRippleBackground: React.FC<WindRippleBackgroundProps> = ({
  src,
  containerRef,
  perturbation = 0.009,
  overlayClassName = 'bg-gradient-to-b from-black/35 via-emerald-950/25 to-black/45',
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    const host: HTMLElement | null =
      containerRef?.current ||
      wrapper?.parentElement ||
      wrapper ||
      null;

    if (!canvas || !host || !shouldEnableWindRipple()) return;

    const gl =
      (canvas.getContext('webgl', {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
      }) as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

    if (!gl) return;

    let disposed = false;
    let raf = 0;
    let running = false;
    const startTime = performance.now();

    const effectiveStrength = Math.max(
      0.005,
      Math.min(0.011, perturbation > 0.015 ? perturbation * 0.55 : perturbation)
    );

    // ── GL shader compilation & program setup ──────────────────
    const compile = (type: number, source: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, source);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('[WindRippleBackground] Shader compile error:', gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[WindRippleBackground] Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }
    gl.useProgram(program);

    const quad = gl.createBuffer();
    if (!quad) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uImage = gl.getUniformLocation(program, 'uImage');
    const uCover = gl.getUniformLocation(program, 'uCover');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uStrength = gl.getUniformLocation(program, 'uStrength');
    const uAspect = gl.getUniformLocation(program, 'uAspect');

    const imageTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, imageTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let imgAspect = 1376 / 768;

    // ── Full-viewport dynamic sizing & cover UV calculation ────
    const resize = () => {
      if (disposed) return;
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(window.innerWidth || rect.width || host.clientWidth));
      const h = Math.max(1, Math.round(window.innerHeight || rect.height || host.clientHeight));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);

      const canvasAspect = w / h;
      const OVERSCAN = 0.96;
      const cover: [number, number] =
        canvasAspect > imgAspect
          ? [OVERSCAN, (imgAspect / canvasAspect) * OVERSCAN]
          : [(canvasAspect / imgAspect) * OVERSCAN, OVERSCAN];

      gl.uniform2f(uCover, cover[0], cover[1]);
      gl.uniform1f(uAspect, canvasAspect);
    };

    const draw = (now: number) => {
      if (disposed) return;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTex);
      gl.uniform1i(uImage, 0);
      gl.uniform1f(uTime, (now - startTime) * 0.001);
      gl.uniform1f(uStrength, effectiveStrength);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    // Since WindRippleBackground is now the fixed global background for the entire LandingPage,
    // keep the animation loop active while LandingPage is mounted (pausing only if the tab is hidden).
    const loop = (now: number) => {
      if (disposed) return;
      draw(now);
      if (!document.hidden) {
        raf = requestAnimationFrame(loop);
      } else {
        running = false;
      }
    };

    const startLoop = () => {
      if (!running && !document.hidden && !disposed) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };

    const stopLoop = () => {
      if (running) {
        cancelAnimationFrame(raf);
        running = false;
      }
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(host);
    window.addEventListener('resize', resize, { passive: true });

    const onVisibility = () => {
      if (document.hidden) {
        stopLoop();
      } else {
        startLoop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // ── Load close-up paddy-field texture ──────────────────────
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (disposed) return;
      if (img.naturalWidth && img.naturalHeight) {
        imgAspect = img.naturalWidth / img.naturalHeight;
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      resize();
      draw(performance.now());
      setActive(true);
      startLoop();
    };
    img.onerror = () => {
      /* Static CSS background remains visible */
    };
    img.src = src;

    return () => {
      disposed = true;
      stopLoop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      ro.disconnect();
      img.onload = null;
      img.onerror = null;
      gl.deleteTexture(imageTex);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      setActive(false);
    };
  }, [src, containerRef, perturbation]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className="w-full h-full object-cover pointer-events-none overflow-hidden relative"
    >
      {/* Static close-up paddy-field background (bg-cover bg-center) for instant render & mobile fallback */}
      <div
        data-testid="hero-paddy-bg"
        className="absolute inset-0 w-full h-full object-cover bg-cover bg-center bg-no-repeat bg-emerald-950"
        style={{ backgroundImage: `url(${src})` }}
      />
      {/* Autonomous WebGL ambient wind canvas (w-full h-full object-cover, desktop only) */}
      <canvas
        ref={canvasRef}
        data-testid="hero-wind-ripple-canvas"
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500 ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {/* Subtle ambient vignette overlay so glassmorphic panels pop cleanly */}
      <div className={`absolute inset-0 w-full h-full pointer-events-none ${overlayClassName}`} />
    </div>
  );
};

export default WindRippleBackground;
