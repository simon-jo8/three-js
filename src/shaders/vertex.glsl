uniform float time;
uniform float amplitude;
uniform float frequency;
uniform float phase;

varying vec3 vPosition;  // Declare vPosition varying

void main() {
    vec3 newPosition = position;
    newPosition.z += amplitude * sin(frequency * position.z + time + phase);

    vPosition = newPosition; // Pass position to fragment shader
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}