import * as THREE from 'three';
import { gsap } from 'gsap';
import {
    IcosahedronGeometry,
    MeshLambertMaterial,
    Mesh,
    Object3D,
    Vector3,
    Vector2,
    ACESFilmicToneMapping,
    Color,
    FloatType
} from 'three';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as BufferGeometryUtils  from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createNoise2D } from 'simplex-noise';
let noise2D = createNoise2D();


const scene = new THREE.Scene();
scene.background = new THREE.Color( 0xF5F5DC );
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
const max_height = 5;
const water_height = 0.5;
const sand_height = 0.5;

const canvas = document.querySelector('#three');

// RENDERER
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
}, { antialias: true });
renderer.setPixelRatio( window.devicePixelRatio );
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize( sizes.width, sizes.height );

// ENVMAP
let envmap;
let pmremGenerator = new THREE.PMREMGenerator( renderer );
let envmapTexture = await new RGBELoader().setDataType(FloatType).loadAsync( 'assets/desert.hdr' );
envmap = pmremGenerator.fromEquirectangular( envmapTexture ).texture;

// LIGHT
const light = new THREE.DirectionalLight( new Color( "#ffccaa").convertSRGBToLinear(), 1 );
light.position.set(-20,30,30);
light.castShadow = true;
light.shadow.radius = 3
light.shadow.opacity = 0.001
light.shadow.focus = 2
light.shadow.mapSize.width = 5012; // default
light.shadow.mapSize.height = 5012; // default
light.shadow.camera.near = 0.5; // default
light.shadow.camera.far = 500; // default
scene.add( light );

// const ambiantLight = new THREE.AmbientLight( new Color( "#ffffff").convertSRGBToLinear(), 0.3 );
// ambiantLight.position.set(0, 100, 0);
// scene.add( ambiantLight)


// Camera
var camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set(0, 10, 10);
// camera.lookAt(0, 0, 0);

// Perso
let boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
let boxMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});  // Green
let box = new THREE.Mesh(boxGeometry, boxMaterial);
scene.add(box);
let boxPosition = new THREE.Vector2(0, 0);

// 2. Add keyboard controls
window.addEventListener('keydown', function(event) {
    let potentialPosition = boxPosition.clone(); // Potential new position

    // Calculate new position based on key press
    switch (event.code) {
        case 'ArrowUp':
            potentialPosition.y -= 1;
            break;
        case 'ArrowDown':
            potentialPosition.y += 1;
            break;
        case 'ArrowLeft':
            potentialPosition.x -= 1;
            break;
        case 'ArrowRight':
            potentialPosition.x += 1;
            break;
    }

    if (potentialPosition.length() > 5) { // 5 is the radius of your circle
        return; // Do not update boxPosition if new position is outside circle
    }

    // Check if new tile is water or not
    let noise = (noise2D(potentialPosition.x * 0.8, potentialPosition.y * 0.8) +1) * 0.35;
    let height = Math.pow(noise, 2) * max_height;

    if(height > sand_height) { // Only move if the tile is not water
        boxPosition = potentialPosition;
    }
});


// Case

let caseGeometry = new THREE.CylinderGeometry(0, 0, 0, 6);
let sandGeometry = new THREE.CylinderGeometry(0, 0, 0, 6);
let waterGeometry = new THREE.CylinderGeometry(0, 0, 0, 6);

function tilePosition(i, j) {
    return new Vector3((i+(j%2)*0.5)*1.77,0, j*1.535)
}

let textures = {
    sand : await new THREE.TextureLoader().loadAsync('assets/low_poly/sand.jpeg'),
    water : await new THREE.TextureLoader().loadAsync('assets/low_poly/water.jpeg'),
};

function hexGeometry(height, position) {
    let geometry = new THREE.CylinderGeometry(1, 1, height, 6);
    geometry.translate(position.x, height * 0.5, position.z);
    return geometry;
}

function makeHex(height, position) {
    let geometry = hexGeometry(height, position);
    if(height > sand_height) {
        sandGeometry = BufferGeometryUtils.mergeBufferGeometries([sandGeometry, geometry], false);
    } else{
        let wg = hexGeometry(water_height, position);
        waterGeometry = BufferGeometryUtils.mergeBufferGeometries([waterGeometry, wg], false);
    }

    caseGeometry = BufferGeometryUtils.mergeBufferGeometries([caseGeometry, geometry], false);
}



function hexMesh(geometry, material) {
    let mat = new THREE.MeshPhysicalMaterial(
        {
            envMap: envmap,
            envMapIntensity: 0.21,
            flatShading: true,
            map:material
        })

    let mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = true; //default is false
    mesh.receiveShadow = true; //default
    return mesh
}

for (let i = -10; i <= 10; i++) {
    for(let j = -10; j <= 10; j++) {
        let position = tilePosition(i, j);
        if(position.length() > 5) continue;
        let noise = (noise2D(i * 0.8, j * 0.8) +1) * 0.35;
        noise = Math.pow(noise, 2);
        makeHex(noise * max_height, tilePosition(i, j));
    }

}

let sandMesh = hexMesh(sandGeometry, textures.sand);
let waterMesh = hexMesh(waterGeometry, textures.water);

scene.add(sandMesh,waterMesh);


// Controls
const controls = new OrbitControls( camera, canvas );
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);

// Animate
function animate() {
    requestAnimationFrame( animate );
    let position = tilePosition(boxPosition.x, boxPosition.y);
    box.position.set(position.x, position.y, position.z);

    // Adjust height based on the height of the current tile
    let noise = (noise2D(boxPosition.x * 0.8, boxPosition.y * 0.8) +1) * 0.35;
    let height = Math.pow(noise, 2) * max_height;
    box.position.y = height;

    controls.update();
    renderer.render( scene, camera );
}

animate();

function animateGrowth() {
    gsap.from([sandMesh.scale, waterMesh.scale], {
        duration: 2, // animation duration in seconds
        y: 0, // start value
        ease: "power2.out", // easing function to make the animation more natural
    });
}
function regenerateTerrain() {
    // Remove old meshes from the scene
    scene.remove(sandMesh, waterMesh);

    // Clear old geometries
    caseGeometry.dispose();
    sandGeometry.dispose();
    waterGeometry.dispose();

    // Generate a new seed for the noise function
    const newSeed = Math.random;
    noise2D = createNoise2D(newSeed);


    // Create new empty geometries
    caseGeometry = new THREE.CylinderGeometry(0, 0, 0, 6);
    sandGeometry = new THREE.CylinderGeometry(0, 0, 0, 6);
    waterGeometry = new THREE.CylinderGeometry(0, 0, 0, 6);

    // Regenerate the terrain
    for (let i = -10; i <= 10; i++) {
        for(let j = -10; j <= 10; j++) {
            let position = tilePosition(i, j);
            if(position.length() > 5) continue;
            let noise = (noise2D(i * 0.8, j * 0.8) +1) * 0.35;
            noise = Math.pow(noise, 2);
            makeHex(noise * max_height, tilePosition(i, j));
        }
    }

    // Re-create the meshes
    sandMesh = hexMesh(sandGeometry, textures.sand);
    waterMesh = hexMesh(waterGeometry, textures.water);

    // Re-add them to the scene
    scene.add(sandMesh, waterMesh);

    // Begin animation
    animateGrowth();
}

document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
        regenerateTerrain();
    }
});



