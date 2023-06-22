varying vec3 vPosition;  // Get position

void main() {
    vec3 darkPurple = vec3(0.2, 0.0, 0.4);  // Dark purple RGB color
    vec3 brightPurple = vec3(0.7, 0.0, 1.0);  // Bright purple RGB color

    // Calculate distance from the center in the x-y plane
    float distanceFromCenter = length(vPosition.xy);

    // Normalize the distance (you might need to adjust this depending on the size of your object)
    float normalizedDistance = distanceFromCenter / 1.0;

    // Mix dark and bright purple based on the distance from the center
    vec3 color = mix(brightPurple, darkPurple, normalizedDistance);

    gl_FragColor = vec4(color, 1.0);
}