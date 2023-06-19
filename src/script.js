import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import vertex from "./vertex.glsl"
import fragment from "./fragment.glsl"

const scene = new THREE.Scene();
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
let speed = 0.05; // speed of the camera
let loopLength = 50; // length of the loop, should be less than or equal to plane size

scene.background = new THREE.Color( 0xF5F5DC );
const canvas = document.querySelector('#three');
scene.fog = new THREE.Fog(0xF5F5DC, 1, 50);  // color, near, far

// LIGHT
var ambientLight = new THREE.AmbientLight( 0x404040 ); // soft white light
scene.add( ambientLight );


var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
directionalLight.position.set(0, 10, 0); // set the light direction
directionalLight.castShadow = true; // enable shadow for the light
scene.add( directionalLight );


// Camera
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);



// Plane
var geometry = new THREE.PlaneGeometry( 100, 100 ,100,100);


var material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    wireframe: false,
    side: THREE.DoubleSide,
    uniforms: {
        fogColor: { value: scene.fog.color },
        fogNear: { value: scene.fog.near },
        fogFar: { value: scene.fog.far },
    }
});


var plane = new THREE.Mesh( geometry, material );
plane.receiveShadow = true; // enable shadow for the plane
plane.rotation.x = Math.PI / 2;


scene.add( plane );

// SPHERE

const controls = new OrbitControls( camera, canvas );

const renderer = new THREE.WebGLRenderer({
    canvas: canvas
}, { antialias: true });
renderer.shadowMap.enabled = true; // enable shadow
renderer.setSize( sizes.width, sizes.height );

// Animate
function animate() {
    requestAnimationFrame( animate );
    controls.update();
    camera.position.x += speed;
    camera.position.x %= loopLength;
    camera.lookAt(0, 0, 0);
    renderer.render( scene, camera );
}

animate();