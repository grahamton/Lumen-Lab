varying vec2 vUv;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uGenTime; // New: Generator specific time
uniform float uAspect; // Canvas Aspect Ratio
uniform float uImageAspect; // Image Aspect Ratio
uniform float uShape; // 0=Rect, 1=Circle

// Transforms
uniform vec4 uTransforms; // x, y, scale, rotation

// Symmetry
uniform bool uSymEnabled;
uniform float uSymSlices;
uniform float uSymType; // 0=Radial, 1=MirrorX, 2=MirrorY
uniform float uSymOffset;

// Warp & Distortion
uniform float uWarpType; // 0=none, 1=polar, 2=log-polar
uniform vec2 uDisplacement; // amp, freq

// Tiling
uniform float uTilingType; // 0=none, 1=p1-grid, 2=p2-spin, 3=p4m-mirror
uniform float uTilingScale;
uniform float uTilingOverlap; // 0-1 blend to center UV

// Color & Effects
uniform float uPosterize;
uniform vec3 uColorHSL; // h (offset), s (mult), l (mult)
uniform vec4 uEffects; // edge, invert, solarize, shift
uniform float uEdgeQuality; // 1 = full Sobel (9-tap), 0 = fast Laplacian (5-tap)

// Generator
uniform float uGenType; // 0=none, 1=fib, 2=voronoi, 3=grid, 4=liquid, 5=plasma, 6=fractal
uniform vec3 uGenParams; // p1, p2, p3

#define PI 3.14159265359

// --- NOISE & MATH HELPERS ---
float random (in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

vec3 rgb2hsb( in vec3 c ){
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsb2rgb( in vec3 c ){
    vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(in vec2 st) {
    // Initial values
    float value = 0.0;
    float amplitude = .5;
    float frequency = 0.0;
    // Loop of octaves
    for (int i = 0; i < 6; i++) {
        value += amplitude * snoise(st);
        st *= 2.;
        amplitude *= .5;
    }
    return value;
}

// --- GENERATORS ---

vec3 fibonacciSpiral(vec2 uv) {
    vec2 center = uv - 0.5;
    float dist = length(center);
    float angle = atan(center.y, center.x);
    float r = dist * uGenParams.y; // Zoom
    float theta = angle + uGenTime * 0.1;
    float spiral = sin(10.0 * log(r + 0.0001) + theta * uGenParams.x); // Density
    float val = smoothstep(-0.2, 0.2, spiral);
    return vec3(val);
}

vec3 voronoi(vec2 uv) {
    vec2 st = uv * uGenParams.x * 0.1 + 1.0; // Scale
    vec2 i_st = floor(st);
    vec2 f_st = fract(st);
    float m_dist = 1.0;

    for (int y= -1; y <= 1; y++) {
        for (int x= -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x),float(y));
            vec2 point = vec2(random(i_st + neighbor));
            point = 0.5 + 0.5*sin(uGenTime*0.5 + 6.2831*point);
            vec2 diff = neighbor + point - f_st;
            float dist = length(diff);
            m_dist = min(m_dist, dist);
        }
    }
    float val = smoothstep(0.0, uGenParams.y * 0.01 + 0.1, m_dist);
    return vec3(val);
}

vec3 basicGrid(vec2 uv) {
    vec2 st = uv * uGenParams.x * 0.2; // Scale

    // Thickness (Parameter 2: 1-100 -> 0.005-0.5)
    float thick = uGenParams.y * 0.005;

    // Softness (Parameter 3: 1-100 -> 0.001-0.2)
    // We add a small base softness to avoid hard aliasing if 0
    float soft = uGenParams.z * 0.002 + 0.001;

    // Distance from grid line (0.0 at line center, 0.5 at tile center)
    vec2 grid = abs(fract(st - 0.5) - 0.5);

    // Smoothstep for anti-aliased/soft line
    // If distance < thick, we want 1.0 (inverted later).
    // smoothstep returns 0.0 if x < edge0
    float lineX = smoothstep(thick - soft, thick + soft, grid.x);
    float lineY = smoothstep(thick - soft, thick + soft, grid.y);

    // Combine axes (Union) and Invert so Line is White (1.0)
    return vec3(1.0 - min(lineX, lineY));
}

vec3 liquid(vec2 uv) {
    vec2 st = uv * uGenParams.x * 0.05;
    float n = snoise(st + uGenTime * uGenParams.y * 0.002); // Flow
    // Layering
    n += 0.5 * snoise(st * 2.0 - uGenTime * 0.2);
    float val = smoothstep(0.2, 0.8, n + 0.5);
    // Colorize
    return vec3(
        val * sin(uGenTime + n),
        val * cos(uGenTime + n),
        val
    );
}

vec3 plasma(vec2 uv) {
    vec2 st = uv * uGenParams.x * 0.1;
    float v = 0.0;
    v += sin((st.x + uGenTime * 0.5));
    v += sin((st.y + uGenTime) / 2.0);
    v += sin((st.x + st.y + uGenTime) / 2.0);
    vec2 c = st + vec2(sin(uGenTime), cos(uGenTime));
    v += sin(length(c) * (uGenParams.y * 0.1));

    // Map -something to 0..1
    v = v / 4.0;

    return vec3(
        0.5 + 0.5 * sin(PI * v + uGenTime),
        0.5 + 0.5 * sin(PI * v + uGenTime + 2.0),
        0.5 + 0.5 * sin(PI * v + uGenTime + 4.0)
    );
}

vec3 fractalNoise(vec2 uv) {
    // scale
    vec2 st = uv * uGenParams.x * 0.05;

    // time/speed (Param 3)
    vec2 q = vec2(0.);
    q.x = fbm(st + 0.00 * uGenTime);
    q.y = fbm(st + vec2(1.0));

    vec2 r = vec2(0.);
    r.x = fbm(st + 1.0 * q + vec2(1.7, 9.2) + 0.15 * uGenTime * (uGenParams.z * 0.1));
    r.y = fbm(st + 1.0 * q + vec2(8.3, 2.8) + 0.126 * uGenTime * (uGenParams.z * 0.1));

    float f = fbm(st + r);

    // Colorize based on detailed noise
    vec3 color = mix(vec3(0.101961,0.619608,0.666667),
                     vec3(0.666667,0.666667,0.498039),
                     clamp((f*f)*4.0,0.0,1.0));

    color = mix(color,
                vec3(0,0,0.164706),
                clamp(length(q),0.0,1.0));

    color = mix(color,
                vec3(0.666667,1,1),
                clamp(length(r.x),0.0,1.0));

    // Param 2: Intensity/Contrast or Detail modification
    return color * (uGenParams.y * 0.02 + 0.5);
}

// --- CONTENT FETCHER ---
vec4 getContent(vec2 uv) {
    if (uGenType > 0.5) {
        vec3 gen = vec3(0.0);
        if (uGenType < 1.5) gen = fibonacciSpiral(uv);
        else if (uGenType < 2.5) gen = voronoi(uv);
        else if (uGenType < 3.5) gen = basicGrid(uv);
        else if (uGenType < 4.5) gen = liquid(uv);
        else if (uGenType < 5.5) gen = plasma(uv);
        else gen = fractalNoise(uv);
        return vec4(gen, 1.0);
    } else {
        // Bounds check inside fetcher
        if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
             return texture2D(uTexture, uv);
        } else {
             return vec4(0.0, 0.0, 0.0, 0.0);
        }
    }
}

// --- MAIN ---
void main() {
    vec2 uv = vUv;
    vec2 uvOriginal = uv;

    // 1. Tiling Logic (Modify UVs first)
    // ... (Keep existing tiling logic structure, just abstracting sampling)
    vec2 tileUV = uv;
    if (uTilingType > 0.5) {
        tileUV = uv * uTilingScale;
        if (uTilingType > 2.5) { // p4m Mirror
             vec2 grid = fract(tileUV);
             if (mod(floor(tileUV.x), 2.0) == 1.0) grid.x = 1.0 - grid.x;
             if (mod(floor(tileUV.y), 2.0) == 1.0) grid.y = 1.0 - grid.y;
             tileUV = grid;
        } else {
             tileUV = fract(tileUV);
        }
        uv = mix(tileUV, uvOriginal, clamp(uTilingOverlap, 0.0, 1.0)); // Update the working UV with optional overlap blend
    }

    // 2. Coordinates centering
    vec2 center = vec2(0.5);
    vec2 coord = uv - center;

    // Correct for Aspect Ratio (Square space for rotation)
    coord.x *= uAspect;

    // 3. Displacement (Liquify)
    if (uDisplacement.x > 0.0) {
        float freq = uDisplacement.y * 10.0;
        float amp = uDisplacement.x * 0.001;
        coord.x += sin(coord.y * freq) * amp;
        coord.y += cos(coord.x * freq) * amp;
    }

    // 4. Symmetry (Kaleidoscope) - NOW FIRST
    if (uSymEnabled) {
        if (uSymType < 0.5) { // 0: Radial (Default)
            float angle = atan(coord.y, coord.x);
            float radius = length(coord);
            float slice = (2.0 * PI) / uSymSlices;
            angle = mod(angle, slice);
            angle = abs(angle - slice * 0.5); // Mirror within slice
            coord = vec2(cos(angle) * radius, sin(angle) * radius);
        } else if (uSymType < 1.5) { // 1: Mirror X
            coord.x = abs(coord.x - uSymOffset) + uSymOffset;
        } else { // 2: Mirror Y
            coord.y = abs(coord.y - uSymOffset) + uSymOffset;
        }
    }

    // 5. Warp - NOW SECOND
    if (uWarpType > 0.5) {
        float r = length(coord);
        float a = atan(coord.y, coord.x);

        if (uWarpType < 1.5) { // Polar
            coord = vec2(a / (2.0 * PI) + 0.5, r);
        } else { // Log Polar
            coord = vec2(a / (2.0 * PI) + 0.5, log(r + 0.0001));
        }
    }

    // 6. Transform (Inverse applied to texture coords)
    // Rotate
    float s = sin(-uTransforms.w);
    float c = cos(-uTransforms.w);
    coord = mat2(c, -s, s, c) * coord;

    // Scale
    coord /= uTransforms.z;

    // Translate
    coord -= vec2(uTransforms.x, -uTransforms.y) * 0.001;

    // Restore UV to Texture Space (0-1)

    // IMAGE FIT: CONTAIN logic
    if (uAspect > uImageAspect) {
        coord.x /= uImageAspect; // Scale X to be relative to Image Height
    } else {
        coord.x /= uAspect; // Back to 1.0 range
        coord.y *= (uAspect / uImageAspect); // Scale Y
    }

    coord += center; // Back to 0..1

    // 7. Sample Content (Base)
    vec4 texColor = getContent(coord);
    vec3 color = texColor.rgb;

    // --- COLOR GRADING (RGB & HSL) ---

    // 2. HSL Grading — always apply, use additive injection so grayscale generators get colorized
    {
        vec3 hsb = rgb2hsb(color);
        // Hue: offset
        hsb.x = fract(hsb.x + uColorHSL.x);
        // Saturation: additive offset from neutral (1.0 = no change, >1 injects color into grayscale)
        hsb.y = clamp(hsb.y + (uColorHSL.y - 1.0), 0.0, 1.0);
        // Brightness: multiplier
        hsb.z = clamp(hsb.z * uColorHSL.z, 0.0, 1.0);
        color = hsb2rgb(hsb);
    }

    // 8. Effects

    // Shift (NOW WORKS ON EVERYTHING)
    if (uEffects.w > 0.0) {
        float shiftValue = uEffects.w * 0.01;
        // We re-sample the CONTENT function, not the texture directly
        float r = getContent(coord - vec2(shiftValue, 0.0)).r;
        float b = getContent(coord + vec2(shiftValue, 0.0)).b;
        color.r = r;
        color.b = b;
    }

    // Edge Detect — full 9-tap Sobel or fast 5-tap Laplacian depending on uEdgeQuality
    if (uEffects.x > 0.0) {
        vec2 texel = 1.0 / uResolution.xy;
        float edge;
        if (uEdgeQuality > 0.5) {
            // Full Sobel kernel (9 texture lookups)
            float tl = dot(getContent(coord + texel * vec2(-1.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
            float t  = dot(getContent(coord + texel * vec2(0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
            float tr = dot(getContent(coord + texel * vec2(1.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
            float l  = dot(getContent(coord + texel * vec2(-1.0, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
            float r  = dot(getContent(coord + texel * vec2(1.0, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
            float bl = dot(getContent(coord + texel * vec2(-1.0, -1.0)).rgb, vec3(0.299, 0.587, 0.114));
            float b  = dot(getContent(coord + texel * vec2(0.0, -1.0)).rgb, vec3(0.299, 0.587, 0.114));
            float br = dot(getContent(coord + texel * vec2(1.0, -1.0)).rgb, vec3(0.299, 0.587, 0.114));
            float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
            float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
            edge = clamp(sqrt(gx * gx + gy * gy), 0.0, 1.0);
        } else {
            // Fast Laplacian approximation (5 texture lookups — ~45% fewer samples)
            float c  = dot(getContent(coord).rgb,                              vec3(0.299, 0.587, 0.114));
            float n  = dot(getContent(coord + texel * vec2( 0.0,  1.0)).rgb,  vec3(0.299, 0.587, 0.114));
            float s  = dot(getContent(coord + texel * vec2( 0.0, -1.0)).rgb,  vec3(0.299, 0.587, 0.114));
            float e  = dot(getContent(coord + texel * vec2( 1.0,  0.0)).rgb,  vec3(0.299, 0.587, 0.114));
            float w  = dot(getContent(coord + texel * vec2(-1.0,  0.0)).rgb,  vec3(0.299, 0.587, 0.114));
            edge = clamp(abs(4.0 * c - n - s - e - w), 0.0, 1.0);
        }
        float edgeMix = clamp(uEffects.x * 0.01, 0.0, 1.0);
        color = mix(color, vec3(edge), edgeMix);
    }

    // Invert
    if (uEffects.y > 0.0) {
        color = mix(color, 1.0 - color, uEffects.y * 0.01);
    }

    // Solarize
    if (uEffects.z > 0.0) {
        float luma = dot(color, vec3(0.299, 0.587, 0.114));
        vec3 sol = color;
        if (luma > 0.5) sol = 1.0 - color;
        color = mix(color, sol, uEffects.z * 0.01);
    }

    // Posterize
    if (uPosterize < 255.0) {
        float levels = uPosterize;
        color = floor(color * levels) / levels;
    }

    vec4 finalColor = vec4(color, texColor.a);

    // 9. Shape Mask (Circle)
    if (uShape > 0.5) {
        vec2 center = vec2(0.5);
        vec2 distVec = vUv - center;
        distVec.x *= uAspect; // Correct for canvas aspect to get perfect circle
        float dist = length(distVec);

        float alpha = 1.0 - smoothstep(0.495, 0.505, dist);
        finalColor.a *= alpha;
    }

    gl_FragColor = finalColor;
}
