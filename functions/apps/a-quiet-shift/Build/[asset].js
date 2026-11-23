const assets = {
    'WebBuild.data.br': { file: 'data', parts: 11, bytes: 268052071, type: 'application/octet-stream' },
    'WebBuild.framework.js.br': { file: 'framework.js', parts: 1, bytes: 69308, type: 'text/javascript' },
    'WebBuild.wasm.br': { file: 'wasm', parts: 1, bytes: 6044960, type: 'application/wasm' },
};

async function streamAsset(env, url, asset, writable) {
    try {
        for (let part = 0; part < asset.parts; part++) {
            const path = new URL('payload-0.1.4/' + asset.file + '.' + part + '.bin', url);
            const response = await env.ASSETS.fetch(new Request(path));
            if (!response.ok || !response.body) throw new Error('Missing Unity build asset ' + path.pathname);
            await response.body.pipeTo(writable, { preventClose: true });
        }
        await writable.close();
    } catch (error) {
        await writable.abort(error);
    }
}

export function onRequest({ request, env, waitUntil, params }) {
    const asset = Object.hasOwn(assets, params.asset) ? assets[params.asset] : undefined;
    if (!asset) return new Response('Not found', { status: 404 });
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    }

    const headers = {
        'Content-Type': asset.type,
        'Content-Encoding': 'br',
        'Content-Length': String(asset.bytes),
        'Cache-Control': 'public, max-age=3600, no-transform',
        'Vary': 'Accept-Encoding',
    };
    if (request.method === 'HEAD') return new Response(null, { headers });

    const stream = new FixedLengthStream(asset.bytes);
    waitUntil(streamAsset(env, request.url, asset, stream.writable));
    return new Response(stream.readable, { headers, encodeBody: 'manual' });
}
