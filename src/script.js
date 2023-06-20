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
import alea from 'alea';
const seed = alea('seed');
let noise2D = createNoise2D(seed);
import vertex from "./shaders/vertex.glsl"
import fragment from "./shaders/fragment.glsl"



const scene = new THREE.Scene();
scene.background = new THREE.Color( 0xF5F5DC );
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
const axesHelper = new THREE.AxesHelper( 5 );
scene.add( axesHelper );
const max_height = 5;
const water_height = 0.5;
const sand_height = 0.5;
let circleCenter = new THREE.Vector2(0, 0); // adjust as needed
let circleRadius = 4; // adjust as needed

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


// Portal
let cube;

const points = [];

for ( let deg = 0; deg <= 180; deg += 6 ) {

    const rad = Math.PI * deg / 180;
    const point = new THREE.Vector2( ( 0.72 + .08 * Math.cos( rad ) ) * Math.sin( rad ), - Math.cos( rad ) ); // the "egg equation"
    points.push( point );

}

const portalGeometry = new THREE.LatheGeometry( points, 32 );
var portalMaterial = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    side: THREE.DoubleSide,
    uniforms: {
        color1: {
            type: 'c',
            value: new THREE.Color(0x9c00ff)
        },
        color2: {
            type: 'c',
            value: new THREE.Color(0x320088)
        },
        glowIntensity: {
            type: 'f',
            value: 0.6
        }
    },
    wireframe: false,
});
// Inside your regenerateTerrain function, after creating the sandMesh:
cube = new THREE.Mesh(portalGeometry, portalMaterial);
let randomPosition;
let height;

do {
    let randomX = Math.floor(Math.random() * 21) - 10; // random between -10 and 10
    let randomY = Math.floor(Math.random() * 21) - 10; // random between -10 and 10
    randomPosition = new THREE.Vector2(randomX, randomY);
    let noise = (noise2D(randomPosition.x * 0.8, randomPosition.y * 0.8) +1) * 0.35;
    height = Math.pow(noise, 2) * max_height;
} while(height <= sand_height || randomPosition.distanceTo(circleCenter) > 2);

let position = tilePosition(randomPosition.x, randomPosition.y);
cube.position.set(position.x, position.y, position.z);

// You don't need to recalculate height here because it already has the correct value
cube.position.y = height + 0.25;

scene.add(cube);

// Perso
let boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
let boxMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});  // Green
let box = new THREE.Mesh(boxGeometry, boxMaterial);
scene.add(box);
let boxPosition = new THREE.Vector2(0, 0);



window.addEventListener('keydown', function(event) {


    let potentialPositions = [];
    let xOffset = boxPosition.y % 2 == 0 ? 1 : -1;
    console.log(xOffset)
    console.log(boxPosition)

    // Calculate new positions based on key press
    switch (event.code) {
        case 'ArrowUp':
            potentialPositions.push([boxPosition.clone().add(new THREE.Vector2(0, -1)), 1]); // Up, priority 1
            potentialPositions.push([boxPosition.clone().add(new THREE.Vector2(xOffset, -1)), 2]); // Up-Right if even row, Up-Left if odd row, priority 2
            break;
        case 'ArrowDown':
            potentialPositions.push([boxPosition.clone().add(new THREE.Vector2(0, 1)), 1]); // Down, priority 1
            potentialPositions.push([boxPosition.clone().add(new THREE.Vector2(xOffset, 1)), 2]); // Down-Right if even row, Down-Left if odd row, priority 2
            break;
        case 'ArrowLeft':
            potentialPositions.push([boxPosition.clone().add(new THREE.Vector2(-1, 0)), 1]); // Left, priority 1
            break;
        case 'ArrowRight':
            potentialPositions.push([boxPosition.clone().add(new THREE.Vector2(1, 0)), 1]); // Right, priority 1
            break;
    }
    console.log(potentialPositions)

    potentialPositions = potentialPositions.map(([pos, priority]) => {
        let noise = (noise2D(pos.x * 0.8, pos.y * 0.8) + 1) * 0.35;
        let height = Math.pow(noise, 2) * max_height;
        let canMove = height > sand_height;
        return [pos, priority, canMove];
    }).filter(([_, __, canMove]) => canMove);

    potentialPositions.sort((a, b) => a[1] - b[1]);

    if(potentialPositions.length > 0) {
        let potentialPosition = potentialPositions[0][0];
        if(potentialPosition.distanceTo(circleCenter) < circleRadius) {
            boxPosition = potentialPosition;
        }
        if(boxPosition.equals(randomPosition)) {
            regenerateTerrain();
        }
    }
    console.log(boxPosition)
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
    box.position.y = height + 0.25;
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
    scene.remove(sandMesh, waterMesh, cube);

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

    // Create a new cube with a random position
    cube = new THREE.Mesh(portalGeometry, portalMaterial);
    let cubePosition, height;
    do {
        let randomX = Math.floor(Math.random() * 21) - 10; // random between -10 and 10
        let randomY = Math.floor(Math.random() * 21) - 10; // random between -10 and 10
        cubePosition = new THREE.Vector2(randomX, randomY);
        let noise = (noise2D(cubePosition.x * 0.8, cubePosition.y * 0.8) +1) * 0.35;
        height = Math.pow(noise, 2) * max_height;
    } while(height <= sand_height || cubePosition.distanceTo(circleCenter) > 2);
    let position = tilePosition(cubePosition.x, cubePosition.y);
    randomPosition = cubePosition;
    cube.position.set(position.x, height + 0.25, position.z);
    scene.add(cube);

    // Place the box on a random position on a sand tile
    do {
        let randomX = Math.floor(Math.random() * 21) - 10; // random between -10 and 10
        let randomY = Math.floor(Math.random() * 21) - 10; // random between -10 and 10
        boxPosition = new THREE.Vector2(randomX, randomY);
        let noise = (noise2D(boxPosition.x * 0.8, boxPosition.y * 0.8) +1) * 0.35;
        height = Math.pow(noise, 2) * max_height;
    } while(height <= sand_height || boxPosition.distanceTo(circleCenter) > 2);

    // Begin animation
    animateGrowth();
}


document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
        regenerateTerrain();
    }
});



