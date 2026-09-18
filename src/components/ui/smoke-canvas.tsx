"use client"

/**
 * Fondo animado con shader WebGL2 — humo/brasas cálidas que reaccionan al
 * mouse. Mismo shader usado en la versión estática del sitio (origen:
 * Matthias Hurrle @atzedent), portado a un componente de React.
 * Se degrada solo: si el usuario prefiere menos movimiento, tiene una
 * conexión lenta, o el navegador no soporta WebGL2, no se monta nada y
 * queda el fondo sólido definido en CSS.
 */
import { useEffect, useRef } from "react"

const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)
float rnd(vec2 p) {
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}
float noise(in vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  float
  a=rnd(i),
  b=rnd(i+vec2(1,0)),
  c=rnd(i+vec2(0,1)),
  d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p) {
  float t=.0, a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
  for (int i=0; i<5; i++) {
    t+=a*noise(p);
    p*=2.*m;
    a*=.5;
  }
  return t;
}
float clouds(vec2 p) {
	float d=1., t=.0;
	for (float i=.0; i<3.; i++) {
		float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);
		t=mix(t,d,a);
		d=a;
		p*=2./(i+1.);
	}
	return t;
}
void main(void) {
	vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);
	float bg=clouds(vec2(st.x+T*.5,-st.y));
	float bg2=clouds(vec2(st.x*1.6-T*.18,-st.y*1.6+T*.09));
	float smoke=mix(bg,bg2,.45);
	vec3 col=vec3(smoke*.30,smoke*.16,smoke*.055);
	O=vec4(col,1);
}`

const vertexShaderSource = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`

class SmokeRenderer {
  canvas: HTMLCanvasElement
  scale: number
  gl: WebGL2RenderingContext
  program: WebGLProgram | null = null
  buffer: WebGLBuffer | null = null
  uniforms: Record<string, WebGLUniformLocation | null> = {}
  mouseMove = [0, 0]
  mouseCoords = [0, 0]
  pointerCoords = [0, 0]
  nbrOfPointers = 0
  vertices = [-1, 1, -1, -1, 1, 1, 1, -1]

  constructor(canvas: HTMLCanvasElement, scale: number) {
    this.canvas = canvas
    this.scale = scale
    this.gl = canvas.getContext("webgl2") as WebGL2RenderingContext
    this.gl.viewport(0, 0, canvas.width * scale, canvas.height * scale)
  }

  updateScale(scale: number) {
    this.scale = scale
    this.gl.viewport(0, 0, this.canvas.width * scale, this.canvas.height * scale)
  }

  compile(shader: WebGLShader, source: string) {
    const gl = this.gl
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation error:", gl.getShaderInfoLog(shader))
    }
  }

  setup() {
    const gl = this.gl
    const vs = gl.createShader(gl.VERTEX_SHADER)!
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!
    this.compile(vs, vertexShaderSource)
    this.compile(fs, fragmentShaderSource)
    this.program = gl.createProgram()!
    gl.attachShader(this.program, vs)
    gl.attachShader(this.program, fs)
    gl.linkProgram(this.program)
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(this.program))
    }
  }

  init() {
    const gl = this.gl
    const program = this.program!
    this.buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, "position")
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    this.uniforms = {
      resolution: gl.getUniformLocation(program, "resolution"),
      time: gl.getUniformLocation(program, "time"),
    }
  }

  render(now = 0) {
    const gl = this.gl
    const program = this.program
    if (!program || gl.getProgramParameter(program, gl.DELETE_STATUS)) return
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height)
    gl.uniform1f(this.uniforms.time, now * 1e-3)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}

export function SmokeCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const isSmallScreen = window.matchMedia("(max-width: 640px)").matches
    const conn = (navigator as any).connection
    const isSlowConnection = !!conn && (conn.saveData || /2g/.test(conn.effectiveType || ""))
    const supportsWebGL2 = !!window.WebGL2RenderingContext && !!canvas.getContext("webgl2")

    if (prefersReducedMotion || isSlowConnection || !supportsWebGL2) {
      return
    }

    let renderer: SmokeRenderer | null = null
    let rafId = 0

    function resize() {
      if (!canvas || !renderer) return
      const dpr = Math.max(1, (isSmallScreen ? 0.35 : 0.5) * window.devicePixelRatio)
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      renderer.updateScale(dpr)
    }

    function loop(now: number) {
      renderer?.render(now)
      rafId = requestAnimationFrame(loop)
    }

    const dpr = Math.max(1, (isSmallScreen ? 0.35 : 0.5) * window.devicePixelRatio)
    renderer = new SmokeRenderer(canvas, dpr)
    renderer.setup()
    renderer.init()
    resize()
    rafId = requestAnimationFrame(loop)

    window.addEventListener("resize", resize)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}

export default SmokeCanvas
