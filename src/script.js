import * as THREE from 'three';
import { gsap } from 'gsap';
import {
    ACESFilmicToneMapping,
    Color, AnimationMixer,
    FloatType
} from 'three';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as BufferGeometryUtils  from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createNoise2D } from 'simplex-noise';
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";

import alea from 'alea';
const seed = alea('seed');
let noise2D = createNoise2D(seed);
import vertex from "./shaders/vertex.glsl"
import fragment from "./shaders/fragment.glsl"


(async function(){


const scene = new THREE.Scene();
let counter = 0;
scene.background = new THREE.Color( 0xF5F5DC );
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
// const axesHelper = new THREE.AxesHelper( 5 );
// scene.add( axesHelper );
let targetPosition = new THREE.Vector3(0,1,0); // The target position we'll move the box towards

const max_height = 5;
const water_height = 0.4;
const sand_height = 0.5;
let circleCenter = new THREE.Vector2(0, 0); // adjust as needed
let circleRadius = 4; // adjust as needed
// let terrain = [];
let pawnPosition = {i: 0, j: 0};
let leftTile = {i: 0, j: 0};
let rightTile = {i: 0, j: 0};
const params = {
    threshold: 0,
    strength: 1.5,
    radius: 10,
    exposure: 1
};

const canvas = document.querySelector('#three');


// RENDERER
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
}, { antialias: true });
renderer.setPixelRatio( window.devicePixelRatio );
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = Math.pow(params.exposure, 4.0);
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
const light = new THREE.DirectionalLight( new Color( "#ffccaa").convertSRGBToLinear(), 2 );
light.position.set(-20,60,30);
light.castShadow = true;
light.shadow.radius = 3
light.shadow.opacity = 0.001
light.shadow.focus = 2
light.shadow.mapSize.width = 5012; // default
light.shadow.mapSize.height = 5012; // default
light.shadow.camera.near = 0.5; // default
light.shadow.camera.far = 500; // default
scene.add( light );

const ambiantLight = new THREE.AmbientLight( new Color( "#ffffff").convertSRGBToLinear(), 0.5 );
ambiantLight.position.set(0, 100, 0);
scene.add( ambiantLight)


// Camera
var camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set(0, 20, 15);
camera.lookAt(0, 0, 0);


// Plane + fog
let planeGeometry = new THREE.PlaneGeometry(1000, 1000);
let planeMaterial = new THREE.MeshBasicMaterial({color: 0xE98F39});
let plane = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(plane);
plane.rotation.x = -Math.PI / 2;
scene.fog = new THREE.Fog(0xFAC898, 15, 100);




// Portal
let portal;

const points = [];

for ( let deg = 0; deg <= 180; deg += 6 ) {
    const rad = (Math.PI * deg / 180);
    const point = new THREE.Vector2( ( 0.72 + .08 * Math.cos( rad ) ) * Math.sin( rad ), - Math.cos( rad ) ); // the "egg equation"
    points.push( point );
}

const portalGeometry = new THREE.LatheGeometry( points, 32 );
var portalMaterial = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    side: THREE.DoubleSide,
    uniforms: {
        color1: { type: 'c', value: new THREE.Color(0x9c00ff) },
        color2: { type: 'c', value: new THREE.Color(0x320088) },
        glowIntensity: { type: 'f', value: 0.6 },
        time: { type: 'f', value: 0.0 },
        amplitude: { type: 'f', value: 0.1 },
        frequency: { type: 'f', value: 60.0 },
        phase: { type: 'f', value: 0.9 }
    },
    wireframe: false,
});
// Inside your regenerateTerrain function, after creating the sandMesh:
portal = new THREE.Mesh(portalGeometry, portalMaterial);
portal.scale.set(0.7, 0.7, 0.7);
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
portal.position.set(position.x, position.y, position.z);

// You don't need to recalculate height here because it already has the correct value
portal.position.y = height + 0.25;

scene.add(portal);

// Perso
const pandaUrl = 'assets/cutepanda.glb';
const loader = new GLTFLoader();
let box = new THREE.Object3D();

let mixer,jump,walk;
loader.load(pandaUrl, (gltf) => {
    box = gltf.scene;
    box.scale.set(0.3, 0.3, 0.3);
    box.rotation.y = Math.PI / 2;
    scene.add(box);
    console.log(gltf.animations)
    mixer = new AnimationMixer(box);
    const clips = gltf.animations;
    const clip = THREE.AnimationClip.findByName(clips, 'Jump');
    const clip2 = THREE.AnimationClip.findByName(clips, 'Resting2');
    walk = mixer.clipAction(clip2);
    walk.play()
    jump = mixer.clipAction(clip);
})

// let boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
// let boxMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});  // Green
// let box = new THREE.Mesh(boxGeometry, boxMaterial);

// scene.add(box);
// Set the initial position of the box (pawn).
box.position.copy(tilePosition(pawnPosition.i, pawnPosition.j));
box.position.y = 5;

// Case

let caseGeometry = new THREE.CylinderGeometry(0, 0, 0, 6);
let sandGeometry = new THREE.CylinderGeometry(0, 0, 0, 6);
let waterGeometry = new THREE.CylinderGeometry(0, 0, 0, 6);

function tilePosition(i, j) {
    // These should be the actual size of your tiles
    const tileWidth = 1;
    const tileHeight = 1;

    const x = (i + (j % 2) * 0.5) * tileWidth * Math.sqrt(3);
    const z = j * 1.5 * tileHeight;
    return new THREE.Vector3(x, 0, z);
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
            envMapIntensity: 0.1,
            flatShading: true,
            map:material
        })

    let mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = true; //default is false
    mesh.receiveShadow = true; //default
    return mesh
}

let terrain = Array(21).fill().map(() => Array(21).fill(null));  // a 21x21 2D array


for (let i = -10; i <= 10; i++) {
    for(let j = -10; j <= 10; j++) {
        let position = tilePosition(i, j);
        if(position.length() > 5) continue;
        let noise = (noise2D(i * 0.8, j * 0.8) +1) * 0.35;
        noise = Math.pow(noise, 2);
        let height = noise * max_height;
        makeHex(height, position);

        let terrainType = height >= sand_height ? 'sand' : 'water';
        terrain[i + 10][j + 10] = {
            i: i,
            j: j,
            type: terrainType,
            neighbors: [
                {i: i - 1, j: j},  // West
                {i: i + 1, j: j},  // East
                {i: i + (j % 2 == 0 ? 0 : -1), j: j - 1},  // Northwest for even j, Northeast for odd j
                {i: i + (j % 2 == 0 ? 1 : 0), j: j - 1},  // Northeast for even j, Northwest for odd j
                {i: i + (j % 2 == 0 ? 0 : -1), j: j + 1},  // Southwest for even j, Southeast for odd j
                {i: i + (j % 2 == 0 ? 1 : 0), j: j + 1},  // Southeast for even j, Southwest for odd j
            ].filter(n => n.i >= -10 && n.i <= 10 && n.j >= -10 && n.j <= 10)
        };

    }
}



let sandMesh = hexMesh(sandGeometry, textures.sand);
let waterMesh = hexMesh(waterGeometry, textures.water);

scene.add(sandMesh,waterMesh);


// Controls
let composer;
const controls = new OrbitControls( camera, canvas );
controls.enableDamping = true;
controls.enableZoom = false;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 3;
controls.target.set(0, 0, 0);



// Animate
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame( animate );
    portal.material.uniforms.time.value = performance.now() * 0.01;
    // box.position.lerp(targetPosition, 0.1);
    mixer.update(clock.getDelta());
    controls.update();
    renderer.render( scene, camera );
}

animate();

function animateGrowth(portal,heightPortal) {
    gsap.from([sandMesh.scale, waterMesh.scale], {
        duration: 2, // animation duration in seconds
        y: 0, // start value
        ease: "power2.out", // easing function to make the animation more natural
    });
    gsap.fromTo(portal.position, {
        y: heightPortal + 30, // start from a high position
    }, {
        duration: 1,
        y: heightPortal,
        ease: "power2.out",
    });
}
function regenerateTerrain() {
    // Remove old meshes from the scene
    scene.remove(sandMesh, waterMesh, portal);

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
            let height = noise * max_height;
            makeHex(height, position);

            let terrainType = height >= sand_height ? 'sand' : 'water';
            terrain[i + 10][j + 10] = {
                i: i,
                j: j,
                type: terrainType,
                neighbors: [
                    {i: i - 1, j: j},  // West
                    {i: i + 1, j: j},  // East
                    {i: i + (j % 2 == 0 ? 0 : -1), j: j - 1},  // Northwest for even j, Northeast for odd j
                    {i: i + (j % 2 == 0 ? 1 : 0), j: j - 1},  // Northeast for even j, Northwest for odd j
                    {i: i + (j % 2 == 0 ? 0 : -1), j: j + 1},  // Southwest for even j, Southeast for odd j
                    {i: i + (j % 2 == 0 ? 1 : 0), j: j + 1},  // Southeast for even j, Southwest for odd j
                ].filter(n => n.i >= -10 && n.i <= 10 && n.j >= -10 && n.j <= 10)
            };

        }
    }

    // Re-create the meshes
    sandMesh = hexMesh(sandGeometry, textures.sand);
    waterMesh = hexMesh(waterGeometry, textures.water);

    // Re-add them to the scene
    scene.add(sandMesh, waterMesh);

    // Create a new cube with a random position
    portal = new THREE.Mesh(portalGeometry, portalMaterial);
    let portalPosition, heightPortal;
    do {
        let randomX = Math.floor(Math.random() * 21) - 10; // random between -10 and 10
        let randomY = Math.floor(Math.random() * 21) - 10; // random between -10 and 10
        portalPosition = new THREE.Vector2(randomX, randomY);
        let noise = (noise2D(portalPosition.x * 0.8, portalPosition.y * 0.8) +1) * 0.35;
        heightPortal = Math.pow(noise, 2) * max_height;
    } while(heightPortal <= sand_height || portalPosition.distanceTo(circleCenter) > 2);
    let position = tilePosition(portalPosition.x, portalPosition.y);
    portal.position.set(position.x, height + 50, position.z);
    portal.scale.set(0.7, 0.7, 0.7);
    scene.add(portal);

    let heightPerso = (noise2D(pawnPosition.i * 0.8, pawnPosition.j * 0.8) +1) * 0.35;
    heightPerso = Math.pow(heightPerso, 2) * max_height;
    targetPosition.y = heightPerso;
    gsap.to(box.position, {duration: 1, x: targetPosition.x, y: targetPosition.y, z: targetPosition.z});



    if (terrain[pawnPosition.i + 10][pawnPosition.j + 10].type === 'water') {
        console.log('Pawn is in water, moving to sand')
        for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
                let newI = pawnPosition.i + di;
                let newJ = pawnPosition.j + dj;
                if (isValidPosition(newI, newJ) && terrain[newI + 10][newJ + 10] && terrain[newI + 10][newJ + 10].type === 'sand') {
                    pawnPosition.i = newI;
                    pawnPosition.j = newJ;
                    targetPosition.copy(tilePosition(newI, newJ));

                    // Calculate the new height
                    let noise = (noise2D(newI * 0.8, newJ * 0.8) +1) * 0.35;
                    targetPosition.y = Math.pow(noise, 2) * max_height ;
                    gsap.to(box.position, {duration: 1, x: targetPosition.x, y: targetPosition.y, z: targetPosition.z});

                    break;
                }
            }
        }
    }
    // Begin animation
    animateGrowth(portal,heightPortal);
}


document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
        regenerateTerrain();
    }
});

function isValidPosition(i, j) {
    return i >= -10 && i <= 10 && j >= -10 && j <= 10 ;
}
function updateScore() {
    // Update the score display
    document.getElementById('counter').innerText = 'Score: ' + counter;
}

function turnBox(direction, callback) {
    let targetRotation = 0;

    switch (direction) {
        case 'up':
            targetRotation = -Math.PI;
            break;
        case 'down':
            targetRotation = 0;
            break;
        case 'left':
            targetRotation = -Math.PI / 2;
            break;
        case 'right':
            targetRotation = Math.PI / 2;
            break;
    }

    gsap.to(box.rotation, { y: targetRotation, duration: 0.2, ease: "power2.out", onComplete: callback });
}

document.addEventListener('keydown', function (event) {
    let currentTile = terrain[pawnPosition.i + 10][pawnPosition.j + 10];
    let newTile;

    function animateMove() {
        jump.setLoop(THREE.LoopOnce);
        jump.reset();
        jump.play(); // play jump animation
    setTimeout(function() {
    // move the box
        if (newTile && terrain[newTile.i + 10][newTile.j + 10] && terrain[newTile.i + 10][newTile.j + 10].type !== 'water') {
            pawnPosition.i = newTile.i;
            pawnPosition.j = newTile.j;

            let newPosition = tilePosition(pawnPosition.i, pawnPosition.j);
            targetPosition.copy(newPosition);

            // Calculate the new height
            let noise = (noise2D(newTile.i * 0.8, pawnPosition.j * 0.8) + 1) * 0.35;
            targetPosition.y = Math.pow(noise, 2) * max_height ;

            gsap.to(box.position, {duration: 1, x: targetPosition.x, y: targetPosition.y, z: targetPosition.z});
            setTimeout(function() {
                let distanceToPortal = targetPosition.distanceTo(portal.position);
                if (distanceToPortal < 1) { // You might need to adjust this value depending on the sizes of the box and the portal
                    counter++;
                    updateScore()
                    regenerateTerrain();
                }
                },500
            )
        }
    }, 500);

    }

    switch (event.code) {
        case 'ArrowUp':
            // try moving to top right tile, if not water
            if(currentTile.j % 2 === 0 && currentTile.j < 0 || currentTile.j % 2 === 0 && currentTile.j == 0 || currentTile.j % 2 !== 0 && currentTile.j > 0){
                leftTile.i = currentTile.i + 0;
                leftTile.j = currentTile.j - 1;
                rightTile.i = currentTile.i + 1;
                rightTile.j = currentTile.j - 1;
            }else{
                leftTile.i = currentTile.i - 1;
                leftTile.j = currentTile.j - 1;
                rightTile.i = currentTile.i + 0;
                rightTile.j = currentTile.j - 1;
            }
            if (terrain[leftTile.i + 10][leftTile.j + 10] && terrain[leftTile.i + 10][leftTile.j + 10].type === 'water') {
                            // if top right is water, try top left
                            newTile = rightTile;
            }else if(!terrain[leftTile.i + 10][leftTile.j + 10]){
                newTile = rightTile;
            }else{
                newTile = leftTile;
            }
            turnBox('up', animateMove);
            break;
        case 'ArrowDown':
            // try moving to bottom right tile, if not water
            if(currentTile.j % 2 === 0 && currentTile.j > 0 || currentTile.j % 2 === 0 && currentTile.j == 0 || currentTile.j % 2 !== 0 && currentTile.j < 0){
                leftTile.i = currentTile.i - 1;
                leftTile.j = currentTile.j + 1;
                rightTile.i = currentTile.i + 0;
                rightTile.j = currentTile.j + 1;
            }else{
                leftTile.i = currentTile.i + 0;
                leftTile.j = currentTile.j + 1;
                rightTile.i = currentTile.i + 1;
                rightTile.j = currentTile.j + 1;
            }
            console.log(leftTile)
            console.log(rightTile)
            console.log(terrain[leftTile.i + 10][leftTile.j + 10])
            if (terrain[leftTile.i + 10][leftTile.j + 10] && terrain[leftTile.i + 10][leftTile.j + 10].type === 'water') {
                // if top right is water, try top left
                newTile = rightTile;
            }else if(!terrain[leftTile.i + 10][leftTile.j + 10]){
                newTile = rightTile;
            }else{
                newTile = leftTile;
            }
            turnBox('down', animateMove);
            break;
        case 'ArrowLeft':

            newTile = currentTile.neighbors[0];
            turnBox('left', animateMove);
            break;
        case 'ArrowRight':

            newTile = currentTile.neighbors[1];
            turnBox('right', animateMove);
            break;
    }

});

window.addEventListener('resize', function(){
    // assuming you are using three.js and renderer is your THREE.WebGLRenderer
    renderer.setSize(window.innerWidth, window.innerHeight);

    // if you have a camera, you might also want to adjust its aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

}());


