document.addEventListener('DOMContentLoaded', () => {
  initializeThreeScene();

  const revealItems = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 70, 350)}ms`;
    revealObserver.observe(item);
  });

  const filterButtons = document.querySelectorAll('.filter-button');
  const projects = document.querySelectorAll('.project');
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      filterButtons.forEach((item) => item.classList.toggle('active', item === button));
      projects.forEach((project) => {
        const categories = project.dataset.category.split(' ');
        project.classList.toggle('is-hidden', filter !== 'all' && !categories.includes(filter));
      });
    });
  });
});

async function initializeThreeScene() {
  const sceneElement = document.querySelector('[data-three-scene]');
  const canvas = document.querySelector('#hero-canvas');
  if (!sceneElement || !canvas) return;

  try {
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas });
    const pointer = new THREE.Vector2();
    const targetRotation = new THREE.Vector2();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const activePointers = new Map();
    const initialCameraZ = 8.5;
    let targetCameraZ = initialCameraZ;
    let isDragging = false;
    let lastPointer = null;
    let pinchStartDistance = 0;
    let pinchStartZoom = initialCameraZ;

    camera.position.z = initialCameraZ;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const core = new THREE.Group();
    scene.add(core);

    const shellMaterial = new THREE.MeshBasicMaterial({ color: 0xd7f36b, wireframe: true, transparent: true, opacity: 0.82 });
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.72, 2), shellMaterial);
    core.add(shell);

    const innerMaterial = new THREE.MeshBasicMaterial({ color: 0xff744b, transparent: true, opacity: 0.18, depthWrite: false });
    const innerCore = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), innerMaterial);
    core.add(innerCore);

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xff744b, wireframe: true, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.012, 8, 96), ringMaterial);
    ring.rotation.set(0.9, 0.2, 0.3);
    core.add(ring);

    const particlePositions = new Float32Array(210 * 3);
    for (let index = 0; index < particlePositions.length; index += 3) {
      const radius = 3.2 + Math.random() * 2.4;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 5;
      particlePositions[index] = Math.cos(angle) * radius;
      particlePositions[index + 1] = height;
      particlePositions[index + 2] = Math.sin(angle) * radius - 1;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0xe7e5df, size: 0.025, transparent: true, opacity: 0.48 }));
    scene.add(particles);

    const resize = () => {
      const bounds = sceneElement.getBoundingClientRect();
      const width = Math.max(bounds.width, 1);
      const height = Math.max(bounds.height, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const updatePointer = (event) => {
      const bounds = sceneElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
      if (!isDragging) {
        targetRotation.x = pointer.y * 0.18;
        targetRotation.y = pointer.x * 0.28;
      }
    };
    const distanceBetweenPointers = () => {
      const points = [...activePointers.values()];
      if (points.length < 2) return 0;
      return Math.hypot(points[0].clientX - points[1].clientX, points[0].clientY - points[1].clientY);
    };
    const updateZoom = (value) => { targetCameraZ = Math.min(11, Math.max(6.6, value)); };
    resize();
    window.addEventListener('resize', resize);
    sceneElement.addEventListener('pointermove', updatePointer);
    sceneElement.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button')) return;
      activePointers.set(event.pointerId, event);
      sceneElement.setPointerCapture(event.pointerId);
      isDragging = true;
      lastPointer = { x: event.clientX, y: event.clientY };
      if (activePointers.size === 2) { pinchStartDistance = distanceBetweenPointers(); pinchStartZoom = targetCameraZ; }
      sceneElement.classList.add('is-dragging');
    });
    sceneElement.addEventListener('pointermove', (event) => {
      if (!activePointers.has(event.pointerId)) return;
      activePointers.set(event.pointerId, event);
      if (activePointers.size > 1) {
        const distance = distanceBetweenPointers();
        if (pinchStartDistance > 0) updateZoom(pinchStartZoom - (distance - pinchStartDistance) * 0.018);
        return;
      }
      if (!lastPointer) return;
      targetRotation.y += (event.clientX - lastPointer.x) * 0.008;
      targetRotation.x += (event.clientY - lastPointer.y) * 0.006;
      targetRotation.x = Math.max(-1.1, Math.min(1.1, targetRotation.x));
      lastPointer = { x: event.clientX, y: event.clientY };
    });
    const releasePointer = (event) => {
      activePointers.delete(event.pointerId);
      if (activePointers.size < 2) pinchStartDistance = 0;
      if (activePointers.size === 0) { isDragging = false; lastPointer = null; sceneElement.classList.remove('is-dragging'); }
    };
    sceneElement.addEventListener('pointerup', releasePointer);
    sceneElement.addEventListener('pointercancel', releasePointer);
    sceneElement.addEventListener('wheel', (event) => { event.preventDefault(); updateZoom(targetCameraZ + event.deltaY * 0.008); }, { passive: false });
    const animate = (elapsed) => {
      const time = elapsed * 0.001;
      if (!reducedMotion) {
        core.rotation.y += 0.0025;
        core.rotation.x = Math.sin(time * 0.45) * 0.08;
        particles.rotation.y -= 0.00035;
      }
      core.rotation.x += (targetRotation.x - core.rotation.x) * 0.06;
      core.rotation.y += (targetRotation.y - core.rotation.y) * 0.06;
      ring.rotation.z += reducedMotion ? 0 : 0.0015;
      camera.position.z += (targetCameraZ - camera.position.z) * 0.08;
      renderer.render(scene, camera);
      window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
  } catch (error) {
    sceneElement.classList.add('is-fallback');
    console.warn('The interactive 3D scene could not load.', error);
  }
}