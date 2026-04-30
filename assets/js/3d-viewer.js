/**
 * 3D Viewer - Three.js + FBX Loader
 * Charge un modèle FBX, permet la rotation à la souris et le basculement wireframe/base color
 */

(function () {
  // Vérification des dépendances
  if (typeof THREE === 'undefined') {
    console.error('[3D-Viewer] THREE.js n\'est pas chargé!');
    showError('THREE.js n\'est pas chargé. Vérifier la connexion CDN.');
    return;
  }

  const canvas = document.getElementById('canvas');
  if (!canvas) {
    console.error('[3D-Viewer] Canvas non trouvé!');
    showError('Canvas #canvas non trouvé dans le DOM.');
    return;
  }

  function showError(message) {
    const viewer = document.getElementById('viewer-container');
    if (viewer) {
      const errorEl = document.createElement('div');
      errorEl.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(255, 100, 100, 0.95); padding: 2rem; border-radius: 8px;
        color: white; text-align: center; z-index: 100; max-width: 90%;
        font-family: monospace; line-height: 1.6;
      `;
      errorEl.innerHTML = `<strong>❌ Erreur</strong><br>${message}`;
      viewer.appendChild(errorEl);
    }
  }

  // Debug logging
  const log = (msg) => {
    console.log('[3D-Viewer]', msg);
    // Affiche aussi dans la page
    const infoEl = document.querySelector('.viewer-info');
    if (infoEl) {
      infoEl.innerHTML += `<br>${msg}`;
    }
  };
  log('Initialisation du visualiseur 3D...');
  log(`Canvas size: ${canvas.clientWidth}x${canvas.clientHeight}`);

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0e1a);

  const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.z = 8;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0b0e1a, 1);
  log('✓ Renderer créé');

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  // Model container
  let model = null;
  const group = new THREE.Group();
  scene.add(group);

  // State
  let displayMode = 'base-color'; // 'base-color' or 'wireframe'
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };

  // FBX Loader
  const fbxLoader = new THREE.FBXLoader();
  const modelPath = 'assets/models/model.fbx';

  function createTestCube() {
    log('🔷 Création du cube de test...');
    try {
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x6495ed, 
        roughness: 0.5, 
        metalness: 0.5 
      });
      const cube = new THREE.Mesh(geometry, material);
      
      group.add(cube);
      model = cube;
      updateMaterials();
      
      log('✓ Cube de test créé et affiché');
      
      // Stocker la rotation pour l'animation
      cube._testCube = true;
    } catch (e) {
      log('❌ Erreur création cube: ' + e.message);
      showError('Impossible de créer le cube de test: ' + e.message);
    }
  }

  fbxLoader.load(
    modelPath,
    (fbx) => {
      log('✓ Modèle chargé avec succès!');
      model = fbx;
      group.add(model);

      // Center and scale model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 6 / maxDim;

      log(`Dimensions du modèle: ${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}`);
      log(`Échelle appliquée: ${scale.toFixed(2)}`);

      model.position.sub(center.multiplyScalar(scale));
      model.scale.multiplyScalar(scale);

      // Apply material settings
      updateMaterials();

      // Play animations if any
      if (model.animations && model.animations.length > 0) {
        log(`✓ ${model.animations.length} animation(s) trouvée(s)`);
        const mixer = new THREE.AnimationMixer(model);
        model.mixer = mixer;
        const action = mixer.clipAction(model.animations[0]);
        action.play();
      } else {
        log('ℹ Aucune animation trouvée dans le modèle');
      }
    },
    (progress) => {
      const percent = Math.round((progress.loaded / progress.total) * 100);
      log(`Chargement: ${percent}%`);
    },
    (error) => {
      const errorMsg = `Modèle non trouvé: ${modelPath}`;
      log('⚠ ' + errorMsg);
      log('Affichage d\'un cube de test à la place...');
      
      // Affiche l'avertissement sur la page
      const viewer = document.getElementById('viewer-container');
      if (viewer) {
        const warningEl = document.createElement('div');
        warningEl.style.cssText = `
          position: absolute; top: 1rem; right: 1rem;
          background: rgba(255, 200, 0, 0.9); padding: 1rem; border-radius: 8px;
          color: #000; font-size: 0.7rem; z-index: 100; max-width: 250px;
          font-family: monospace;
        `;
        warningEl.innerHTML = `<strong>⚠ Test Mode</strong><br>Fichier FBX introuvable.<br>Affichage: Cube de test<br>(Place ton FBX à assets/models/model.fbx)`;
        viewer.appendChild(warningEl);
      }
      
      createTestCube();
    }
  );


  // Update materials based on display mode
  function updateMaterials() {
    if (!model) return;

    model.traverse((child) => {
      if (child.isMesh) {
        if (displayMode === 'wireframe') {
          child.material.wireframe = true;
        } else {
          child.material.wireframe = false;
        }
      }
    });
  }

  // Controls
  document.getElementById('btn-base-color').addEventListener('click', (e) => {
    displayMode = 'base-color';
    document.querySelectorAll('.viewer-btn').forEach((btn) => btn.classList.remove('active'));
    e.target.classList.add('active');
    updateMaterials();
  });

  document.getElementById('btn-wireframe').addEventListener('click', (e) => {
    displayMode = 'wireframe';
    document.querySelectorAll('.viewer-btn').forEach((btn) => btn.classList.remove('active'));
    e.target.classList.add('active');
    updateMaterials();
  });

  // Keyboard: Spacebar toggle
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      displayMode = displayMode === 'base-color' ? 'wireframe' : 'base-color';
      document.querySelectorAll('.viewer-btn').forEach((btn) => btn.classList.remove('active'));
      document.querySelector(`[data-mode="${displayMode}"]`).classList.add('active');
      updateMaterials();
    }
  });

  // Mouse controls for rotation
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging && group) {
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      group.rotation.y += deltaX * 0.01;
      group.rotation.x += deltaY * 0.01;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);

    // Rotation du cube de test
    if (model && model._testCube) {
      model.rotation.x += 0.005;
      model.rotation.y += 0.007;
    }

    // Update animation mixer if exists
    if (model && model.mixer) {
      model.mixer.update(0.016); // ~60 FPS
    }

    renderer.render(scene, camera);
  }

  log('🎬 Démarrage de la boucle d\'animation...');
  animate();
  log('✓ Visualiseur 3D prêt!');
})();
