import * as THREE from 'three';
import { IcosahedronGeometry, MeshLambertMaterial, Mesh, Object3D, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


import { createNoise3D } from 'simplex-noise';
const noise3D = createNoise3D();

const { random, PI } = Math;

const scene = new THREE.Scene();
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
const canvas = document.querySelector('#three');

const planet = new Object3D();
scene.add(planet);
// LIGHT
var ambientLight = new THREE.AmbientLight( 0x404040 ); // soft white light
scene.add( ambientLight );


var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
directionalLight.position.set(0, 10, 0); // set the light direction
directionalLight.castShadow = true; // enable shadow for the light
scene.add( directionalLight );


// Camera
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);



// planet geometry
const noises = [];

const noiseF = 0.015;
const noiseD = 15;
const noiseWaterTreshold = 0.4;
const noiseWaterLevel = 0.2;

const vNoise = (v, f, i) => {
    const nv = v.clone().multiplyScalar(f);
    let noise = (noise3D(nv.x, nv.y, nv.z) + 1) / 2;
    noise = (noise > noiseWaterTreshold) ? noise : noiseWaterLevel;
    if (Number.isInteger(i)) noises[i] = noise;
    return noise;
};

const dispV = (v, i) => {
    const dv = v.clone();
    dv.add(v.clone().normalize().multiplyScalar(vNoise(dv, noiseF, i) * noiseD));
    v.x = dv.x; v.y = dv.y; v.z = dv.z;
};

let geometry = new THREE.IcosahedronGeometry(100, 4);
const positionAttribute = geometry.getAttribute('position');

let position3D = new THREE.Vector3();

geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array( positionAttribute.count * 3 ), 3 ) );

const colorAttribute = geometry.getAttribute('color');
const landColor = new THREE.Color(0x417B2B);
const waterColor = new THREE.Color(0x2080D0);

for (let i = 0; i < positionAttribute.count; i++) {
    position3D.fromBufferAttribute(positionAttribute, i);
    dispV(position3D, i);
    positionAttribute.setXYZ(i, position3D.x, position3D.y, position3D.z);

    if (noises[i] == noiseWaterLevel) {
        colorAttribute.setXYZ(i, waterColor.r, waterColor.g, waterColor.b);
    } else {
        colorAttribute.setXYZ(i, landColor.r, landColor.g, landColor.b);
    }
}

geometry.computeVertexNormals();

let material = new THREE.MeshLambertMaterial({color: 0xffffff, vertexColors: true, flatShading: true});

let mesh = new THREE.Mesh(geometry, material);


// Color adjustment will be complex due to BufferGeometry format, for now, we just give it a single color.
// For a more detailed implementation, custom shaders or a second geometry might be needed.

planet.add(mesh);

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