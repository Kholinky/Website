const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const controls = document.querySelector('.preview-controls');
const toggle = controls.querySelector('button');
let paused = false;

function canRotate(card) {
    return !paused && !motion.matches && !document.hidden && !card.matches(':hover, :focus-within');
}

document.querySelectorAll('[data-preview-images]').forEach((preview, order) => {
    const urls = preview.dataset.previewImages.split(' ');
    const card = preview.closest('.app-card');
    let visible = preview.querySelector('img');
    let incoming = new Image();
    let index = 0;

    incoming.alt = '';
    preview.append(incoming);

    async function rotate() {
        if (canRotate(card)) {
            index = (index + 1) % urls.length;
            incoming.src = urls[index];
            try {
                await incoming.decode();
                if (canRotate(card)) {
                    incoming.classList.add('is-visible');
                    visible.classList.remove('is-visible');
                    [visible, incoming] = [incoming, visible];
                }
            } catch {
                // Keep the last good frame on screen until another image loads.
            }
        }
        window.setTimeout(rotate, 6500);
    }

    window.setTimeout(rotate, 6500 + order * 1150);
});

toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
});
function updateControls() {
    controls.hidden = motion.matches;
}
motion.addEventListener('change', updateControls);
updateControls();
