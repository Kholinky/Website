const canvas = document.querySelector('#unity-canvas');
const start = document.querySelector('#start');
const progress = document.querySelector('#load-progress');
const status = document.querySelector('#status');
const microphone = document.querySelector('#microphone');
const micStatus = document.querySelector('#mic-status');
const fullscreen = document.querySelector('#fullscreen');

microphone.addEventListener('click', async () => {
    microphone.disabled = true;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        micStatus.textContent = 'Microphone enabled for the game.';
    } catch {
        micStatus.textContent = 'Microphone unavailable. Check the browser’s microphone permission and try again.';
        microphone.disabled = false;
    }
});

fullscreen.addEventListener('click', async () => {
    try {
        await canvas.parentElement.requestFullscreen();
        canvas.focus();
    } catch {
        status.textContent = 'Fullscreen is unavailable in this browser.';
    }
});

start.addEventListener('click', () => {
    start.disabled = true;
    progress.hidden = false;
    status.textContent = 'Loading the game…';

    const script = document.createElement('script');
    script.src = 'Build/WebBuild.loader.js';
    script.onerror = () => showError();
    script.onload = async () => {
        try {
            await createUnityInstance(canvas, {
                dataUrl: 'Build/WebBuild.data.br',
                frameworkUrl: 'Build/WebBuild.framework.js.br',
                codeUrl: 'Build/WebBuild.wasm.br',
                streamingAssetsUrl: 'StreamingAssets',
                companyName: 'DigiPythons',
                productName: 'A Quiet Shift',
                productVersion: '0.1.4',
                showBanner(message, type) {
                    if (type === 'error') showError(message);
                },
            }, value => { progress.value = value; });
            progress.hidden = true;
            start.hidden = true;
            fullscreen.disabled = false;
            status.textContent = 'Game loaded. Click the display to play.';
            canvas.focus();
        } catch (error) {
            console.error(error);
            showError();
        }
    };
    document.head.append(script);
}, { once: true });

function showError(message) {
    progress.hidden = true;
    status.textContent = message || 'The game could not load. Reload the page to try again.';
}
