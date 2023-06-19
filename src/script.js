import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
const canvas = document.querySelector('#three');

// LIGHT
var ambientLight = new THREE.AmbientLight( 0x404040 ); // soft white light
scene.add( ambientLight );


// var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
// directionalLight.position.set(0, 10, 0); // set the light direction
// directionalLight.castShadow = true; // enable shadow for the light
// scene.add( directionalLight );


// Camera
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);



// Plane
var geometry = new THREE.PlaneGeometry( 10, 10 );
var material = new THREE.MeshStandardMaterial( { color: 0x00ff00, side: THREE.DoubleSide } );
var plane = new THREE.Mesh( geometry, material );
plane.receiveShadow = true; // enable shadow for the plane
plane.rotation.x = Math.PI / 2;


scene.add( plane );

// SPHERE

var sphereGeometry = new THREE.SphereGeometry( 1, 32, 32 );

var sphere1 = new THREE.Mesh( sphereGeometry, new THREE.MeshStandardMaterial( { color: 0xff0000 } ) );
sphere1.position.set(-3, 2, 0);
sphere1.castShadow = true;
scene.add( sphere1 );

var sphere2 = new THREE.Mesh( sphereGeometry, new THREE.MeshStandardMaterial( { color: 0x00ff00 } ) );
sphere2.position.set(0, 1, 0);
sphere2.castShadow = true;
scene.add( sphere2 );

var sphere3 = new THREE.Mesh( sphereGeometry, new THREE.MeshStandardMaterial( { color: 0x0000ff } ) );
sphere3.position.set(3, 3, 0);
sphere3.castShadow = true;
scene.add( sphere3 );


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
    renderer.render( scene, camera );
}

animate();