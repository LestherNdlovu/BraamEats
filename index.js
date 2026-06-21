/* ==========================================================================
   CRATE LANDING PAGE - ENGINE & APPLICATION LOGIC
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. ASSET CONFIGURATION & PROGRESSIVE CACHE ---
    const frameCount = 240;
    const frameCache = {}; // index -> Image
    const loadedFrames = new Set();
    let loadedCount = 0;
    
    // Generate keyframe indices to preload (every 5th frame for smoother scrolling, plus the last frame)
    const preloadIndices = [];
    for (let i = 0; i < frameCount; i += 5) {
        preloadIndices.push(i);
    }
    if (!preloadIndices.includes(frameCount - 1)) {
        preloadIndices.push(frameCount - 1);
    }
    const totalAssets = preloadIndices.length;


    // Helper to generate zero-padded frame paths
    function getFramePath(index) {
        const frameNum = String(index).padStart(3, '0');
        return `assets/ezgif-frame-${frameNum}.jpg`;
    }

    // Dynamic Progressive Keyframe Loader & Fallback Engine
    function getFrameImage(index) {
        // If image is already loaded, return it
        if (frameCache[index] && frameCache[index].complete && loadedFrames.has(index)) {
            return frameCache[index];
        }

        // If image is not in cache, start loading it asynchronously
        if (!frameCache[index]) {
            const img = new Image();
            img.src = getFramePath(index + 1); // frames are 1-indexed (ezgif-frame-001.jpg to 240)
            img.onload = () => {
                loadedFrames.add(index);
            };
            img.onerror = () => {
                console.error(`Failed to load frame ${index + 1}`);
            };
            frameCache[index] = img;

            // Evict far away non-keyframe frames if transient cache exceeds limit (max 50 scrolling frames)
            const keys = Object.keys(frameCache);
            const nonKeyframeKeys = keys.filter(k => !preloadIndices.includes(parseInt(k)));
            if (nonKeyframeKeys.length > 50) {
                let maxDistance = -1;
                let keyToEvict = null;
                for (const k of nonKeyframeKeys) {
                    const ki = parseInt(k);
                    const dist = Math.abs(ki - index);
                    if (dist > maxDistance) {
                        maxDistance = dist;
                        keyToEvict = k;
                    }
                }
                if (keyToEvict !== null) {
                    const idxToEvict = parseInt(keyToEvict);
                    delete frameCache[idxToEvict];
                    loadedFrames.delete(idxToEvict);
                }
            }
        }

        // Fallback: search for the nearest loaded frame to prevent flickering
        if (loadedFrames.size === 0) {
            return null;
        }

        let nearestIndex = -1;
        let minDistance = Infinity;
        for (const loadedIdx of loadedFrames) {
            const dist = Math.abs(loadedIdx - index);
            if (dist < minDistance) {
                minDistance = dist;
                nearestIndex = loadedIdx;
            }
        }

        return nearestIndex !== -1 ? frameCache[nearestIndex] : null;
    }

    // --- 2. SELECTORS ---
    const preloader = document.getElementById('preloader');
    const progressBar = document.getElementById('progress-bar');
    const preloaderText = document.getElementById('preloader-text');
    
    const navbar = document.getElementById('navbar');
    const menuTrigger = document.getElementById('menu-trigger');
    const ctaViewMenu = document.getElementById('cta-view-menu');
    const footerMenuLink = document.getElementById('footer-menu-link');
    const menuDrawer = document.getElementById('menu-drawer');
    const drawerClose = document.getElementById('drawer-close');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const mobileToggle = document.getElementById('mobile-toggle');
    const navOrderBtn = document.getElementById('nav-order-btn');
    const drawerOrderBtn = document.getElementById('drawer-order-btn');
    const ctaOrderNow = document.getElementById('cta-order-now');
    
    const canvas = document.getElementById('burger-canvas');
    const ctx = canvas.getContext('2d');
    
    const trackerFill = document.getElementById('tracker-fill');
    const trackerSteps = document.querySelectorAll('.tracker-step');
    const beatSections = document.querySelectorAll('.beat-section');

    // --- 3. STATE ---
    let targetPercent = 0;
    let currentPercent = 0;
    let maxScroll = 1;
    let scrollOffset = 0;
    const lerpFactor = 0.05; // Smoother dampening factor for scroll wheel interpolation
    
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    const mouseLerpFactor = 0.05; // Extra smooth lag for interactive parallax

    // --- 3.5 PARTICLE SYSTEM ---
    const particles = [];
    const maxParticles = 50; // Cap particles for great performance

    class Particle {
        constructor() {
            this.reset(true);
        }

        reset(isInitial = false) {
            const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
            const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
            const center = canvasWidth / 2;
            const spread = 280; // keep particles clustered around the burger center
            
            // 70% embers (warm glowing sparks), 30% seasoning (salt/pepper flakes)
            this.type = Math.random() < 0.7 ? 'ember' : 'seasoning';
            
            this.x = center + (Math.random() - 0.5) * spread;
            
            if (this.type === 'ember') {
                this.y = isInitial ? Math.random() * canvasHeight : canvasHeight + 10;
                this.vx = (Math.random() - 0.5) * 1.6;
                this.vy = -Math.random() * 1.8 - 0.6; // Rise upwards
                this.size = Math.random() * 3 + 1;
                this.color = Math.random() < 0.5 ? 'rgba(255, 90, 30, ' : 'rgba(255, 180, 50, '; // glowing orange or gold
            } else {
                this.y = isInitial ? Math.random() * canvasHeight : -10;
                this.vx = (Math.random() - 0.5) * 1.0;
                this.vy = Math.random() * 1.4 + 0.4; // Fall downwards
                this.size = Math.random() * 2.2 + 0.8;
                // White salt flakes or dark pepper specs
                this.color = Math.random() < 0.6 ? 'rgba(255, 255, 255, ' : 'rgba(50, 50, 48, ';
            }
            
            this.alpha = isInitial ? Math.random() * 0.7 : 0;
            this.maxAlpha = Math.random() * 0.7 + 0.2;
            this.fadeInSpeed = 0.02 + Math.random() * 0.03;
            this.life = Math.random() * 150 + 100;
            this.age = 0;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.age++;
            
            // Fade in at spawn
            if (this.alpha < this.maxAlpha && this.age < 30) {
                this.alpha += this.fadeInSpeed;
            }
            
            // Fade out at end of life
            if (this.age > this.life - 30) {
                this.alpha -= 0.03;
            }
            
            const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
            const canvasHeight = canvas.height / (window.devicePixelRatio || 1);

            // Reset when dead or out of bounds
            if (this.alpha <= 0 || this.y < -20 || this.y > canvasHeight + 20 || this.age >= this.life) {
                this.reset(false);
            }
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
            
            // Glowing embers have drop shadows
            if (this.type === 'ember') {
                ctx.shadowColor = this.color.includes('255, 90') ? '#FF5A1E' : '#FFB432';
                ctx.shadowBlur = this.size * 2.5;
            }
            
            ctx.fillStyle = this.color + this.alpha + ')';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // --- 4. INITIALIZATION & PRELOADING ---
    function init() {
        preloadIndices.forEach(idx => {
            const img = new Image();
            img.src = getFramePath(idx + 1);
            img.onload = () => {
                frameCache[idx] = img;
                loadedFrames.add(idx);
                
                loadedCount++;
                const percentage = Math.round((loadedCount / totalAssets) * 100);
                progressBar.style.width = percentage + '%';
                preloaderText.textContent = percentage + '% LOADED';
                
                if (loadedCount === totalAssets) {
                    startApp();
                }
            };
            img.onerror = () => {
                console.error(`Failed to load keyframe ${idx + 1}`);
                loadedCount++;
                if (loadedCount === totalAssets) {
                    startApp();
                }
            };
        });
    }

    function startApp() {
        // Fade out preloader
        preloader.classList.add('fade-out');
        
        // Fit canvas to screen
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Initialize particle pool
        for (let i = 0; i < maxParticles; i++) {
            particles.push(new Particle());
        }
        
        // Start rendering loop
        requestAnimationFrame(tick);
    }

    // --- 5. CANVAS RESIZING ---
    let lastWidth = 0;

    function resizeCanvas() {
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        
        // On mobile, height changes constantly due to URL bar sliding.
        // We only trigger resize if the width actually changes, preventing layout thrashing.
        if (currentWidth === lastWidth && canvas.width > 0) {
            return;
        }
        
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        // Keep rendering context size matched to device coordinates
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        
        lastWidth = currentWidth;
    }

    // Normalized progress helper
    function getNormalizedProgress(p, start, end) {
        return Math.max(0, Math.min(1, (p - start) / (end - start)));
    }

    // --- 6. CANVAS RENDER LOOP ---
    function renderBurger(p) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        
        // Map progress p (0 to 1) to frame index (0 to 239)
        const frameIndex = Math.min(
            frameCount - 1,
            Math.max(0, Math.floor(p * frameCount))
        );
        
        // Request frame via progressive fallback system
        const img = getFrameImage(frameIndex);
        if (!img) return;

        // Sample mouse movement for parallax lag
        mouseX += (targetMouseX - mouseX) * mouseLerpFactor;
        mouseY += (targetMouseY - mouseY) * mouseLerpFactor;

        // Dynamic Y centering & scaling: on portrait viewports (mobile/tablets), 
        // shift the burger up to 28% of the screen height and scale to 2.5x width (2.5)
        // so that the burger fills the viewport width beautifully and remains clear of the text cards.
        let centerY = height / 2;
        let scaleFactor = 1.0;
        if (height > width) {
            centerY = height * 0.28;
            scaleFactor = 2.5;
        }

        // Apply camera zoom & mouse parallax transform
        ctx.save();
        ctx.translate(width / 2 + mouseX * 25, centerY + mouseY * 15);
        
        // Camera Zoom: zoom in 22% at final stage (p > 0.85)
        let cameraZoom = 1.0;
        if (p > 0.85) {
            const zoomProgress = getNormalizedProgress(p, 0.85, 1.0);
            cameraZoom = 1.0 + (zoomProgress * 0.22);
        }
        ctx.scale(cameraZoom, cameraZoom);
        
        // Fit image responsively using contain mode with scaleFactor
        const imgRatio = img.height / img.width;
        const canvasRatio = height / width;
        
        let drawW, drawH;
        if (canvasRatio > imgRatio) {
            // Screen is taller than 16:9 (mobile portrait)
            drawW = width * scaleFactor;
            drawH = width * imgRatio * scaleFactor;
        } else {
            // Screen is wider than 16:9 (desktop landscape)
            drawW = height / imgRatio;
            drawH = height;
        }
        
        // Draw centered around origin
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
    }

    // --- 9. TICK LOOP (LERP PHYSICS ENGINE) ---
    function tick() {
        // Smoothly interpolate scroll progress
        currentPercent += (targetPercent - currentPercent) * lerpFactor;
        if (isNaN(currentPercent)) currentPercent = 0;
        
        // Redraw canvas at current interpolated scroll position
        renderBurger(currentPercent);
        
        // Update and draw particles on top of the burger
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        
        // Update narrative zones and scroll indicator
        updateOverlays(currentPercent);
        
        
        requestAnimationFrame(tick);
    }

    // --- 10. SCROLL OVERLAYS MANAGER ---
    function updateOverlays(p) {
        // Track the active section index based on exact layout points
        let activeIdx = 0;
        
        if (p < 0.15) {
            activeIdx = 0; // Intro
        } else if (p >= 0.15 && p < 0.40) {
            activeIdx = 1; // The Base
        } else if (p >= 0.40 && p < 0.65) {
            activeIdx = 2; // Layers & Flavor
        } else if (p >= 0.65 && p < 0.85) {
            activeIdx = 3; // The Stack
        } else {
            activeIdx = 4; // The Drop
        }
        
        // Toggle opacity classes on text overlays
        beatSections.forEach((section, idx) => {
            if (idx === activeIdx) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
        
        // Update vertical tracker progress bar fill
        trackerFill.style.height = (p * 100) + '%';
        
        // Toggle tracker list highlights
        trackerSteps.forEach((step, idx) => {
            if (idx === activeIdx) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
        
        // Fade out scroll tracker when burger is fully assembled (Beat 5: activeIdx === 4)
        const scrollTracker = document.querySelector('.scroll-tracker');
        if (scrollTracker) {
            if (activeIdx === 4) {
                scrollTracker.classList.add('hidden');
            } else {
                scrollTracker.classList.remove('hidden');
            }
        }

        // Translucent Navbar fading logic: starts transparent at top, fades in after 2% scroll
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    // --- 11. EVENT LISTENERS & INTERACTION ---

    // Listen to scroll events to update target percentage
    window.addEventListener('scroll', () => {
        const container = document.getElementById('scroll-workspace');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        
        const containerTop = window.scrollY + rect.top;
        const containerHeight = container.scrollHeight;
        const viewportHeight = window.innerHeight;
        
        scrollOffset = window.scrollY - containerTop;
        maxScroll = containerHeight - viewportHeight;
        
        let p = maxScroll > 0 ? scrollOffset / maxScroll : 0;
        if (isNaN(p)) p = 0;
        targetPercent = Math.max(0, Math.min(1, p));
    });


    // Listen to mouse movement for interactive parallax
    window.addEventListener('mousemove', (e) => {
        // Map mouse position from -1 to 1 relative to center screen
        targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
        targetMouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });

    // Touch support for parallax on devices with gyros/movement
    window.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
            const touch = e.touches[0];
            targetMouseX = (touch.clientX / window.innerWidth) * 2 - 1;
            targetMouseY = (touch.clientY / window.innerHeight) * 2 - 1;
        }
    });

    // Slide-over Drawer triggers
    function openMenuDrawer(e) {
        if(e) e.preventDefault();
        menuDrawer.classList.add('open');
        menuDrawer.setAttribute('aria-hidden', 'false');
    }
    
    function closeMenuDrawer() {
        menuDrawer.classList.remove('open');
        menuDrawer.setAttribute('aria-hidden', 'true');
    }

    menuTrigger.addEventListener('click', openMenuDrawer);
    ctaViewMenu.addEventListener('click', openMenuDrawer);
    footerMenuLink.addEventListener('click', openMenuDrawer);
    drawerClose.addEventListener('click', closeMenuDrawer);
    drawerOverlay.addEventListener('click', closeMenuDrawer);

    // Mobile hamburger toggle opens the drawer directly
    mobileToggle.addEventListener('click', () => {
        openMenuDrawer();
    });

    // Handle order actions (simulated checkout)
    const handleOrder = () => {
        alert("CRATE BRAAM SIMULATOR: Redirecting to our Juta Street campus ordering portal... Select your pickup time (3-minute default).");
    };
    
    navOrderBtn.addEventListener('click', handleOrder);
    drawerOrderBtn.addEventListener('click', handleOrder);
    ctaOrderNow.addEventListener('click', handleOrder);

    // Scroll tracker step clicks (scroll directly to active beat percentage)
    trackerSteps.forEach(step => {
        step.addEventListener('click', () => {
            const targetPct = parseFloat(step.getAttribute('data-percent')) / 100;
            const workspace = document.getElementById('scroll-workspace');
            const totalScrollable = workspace.scrollHeight - window.innerHeight;
            
            // Scroll smoothly to target offset
            window.scrollTo({
                top: workspace.offsetTop + (totalScrollable * targetPct) + 5,
                behavior: 'smooth'
            });
        });
    });

    // Keep page link transitions clean
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#menu') return; // Handled by drawer open trigger
            
            e.preventDefault();
            const targetEl = document.querySelector(targetId);
            
            if (targetEl) {
                targetEl.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Launch loader
    init();
});
