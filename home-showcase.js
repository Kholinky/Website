const showcase = document.querySelector('.hero-showcase');
const slides = [...showcase.querySelectorAll('.hero-slide')];
const controls = showcase.querySelector('.hero-showcase-controls');
const pause = controls.querySelector('[data-action="pause"]');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
let current = 0;
let paused = false;
const progress = showcase.querySelector('.hero-showcase-progress');
const fill = progress.querySelector('span');
const slideDuration = 3000;
let elapsed = 0;
let previousFrame;
let frameId;

function syncPlayback() {
    progress.hidden = motion.matches;
    pause.hidden = motion.matches;
    if (motion.matches || document.hidden) {
        window.cancelAnimationFrame(frameId);
        frameId = undefined;
        previousFrame = undefined;
    } else if (frameId === undefined) {
        frameId = window.requestAnimationFrame(tick);
    }
}

function tick(now) {
    if (!paused && !showcase.matches(':hover, :focus-within') && previousFrame !== undefined) {
        elapsed += now - previousFrame;
        if (elapsed >= slideDuration) showSlide(1);
        fill.style.transform = 'scaleX(' + elapsed / slideDuration + ')';
    }
    previousFrame = now;
    frameId = window.requestAnimationFrame(tick);
}

function showSlide(offset) {
    elapsed = 0;
    fill.style.transform = 'scaleX(0)';
    slides[current].classList.remove('is-current');
    slides[current].inert = true;
    slides[current].tabIndex = -1;
    current = (current + offset + slides.length) % slides.length;
    slides[current].classList.add('is-current');
    slides[current].inert = false;
    slides[current].removeAttribute('tabindex');
}

controls.querySelector('[data-action="previous"]').addEventListener('click', () => showSlide(-1));
controls.querySelector('[data-action="next"]').addEventListener('click', () => showSlide(1));
pause.addEventListener('click', () => {
    paused = !paused;
    pause.setAttribute('aria-pressed', String(paused));
});
motion.addEventListener('change', syncPlayback);
document.addEventListener('visibilitychange', syncPlayback);
controls.hidden = false;
syncPlayback();
