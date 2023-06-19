uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
varying vec2 vUv;
varying float height;
varying float depth; // Add this line

void main() {
    vec3 darkBeige = vec3(0.59, 0.44, 0.09);
    vec3 lightBeige = vec3(0.96, 0.96, 0.86);
    float normalizedHeight = (height + 10.0) / 20.0;
    vec3 color = mix(darkBeige, lightBeige, normalizedHeight);

    // Calculate fog effect
    float fogFactor = smoothstep(fogNear, fogFar, depth);
    gl_FragColor = mix(vec4(color, 1.0), vec4(fogColor, 1.0), fogFactor);
}