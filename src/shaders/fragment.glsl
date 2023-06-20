uniform vec3 color1;
uniform vec3 color2;
uniform float glowIntensity;
varying vec3 vNormal;
void main() {
    float intensity = pow(glowIntensity - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
    vec3 glowColor = mix(color1, color2, vNormal.z);
    gl_FragColor = vec4(glowColor, 1.0) * intensity;
}