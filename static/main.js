tlootWASM = {};
tlootWASM.onReady = () => {
    const items = tlootWASM.itemsMap();

    const setStatus = (s) => {
        let status = `Status: ${s}`;
        console.log(status);
        document.getElementById('status').textContent = status;
    };
    const clearFound = () => {
        document.getElementById('found').innerHTML = "";
    };
    const addFound = (text) => {
        const found = document.getElementById('found');
        const line = document.createElement('div');
        line.innerText = text;
        found.appendChild(line);
    };
    const setImageSource = (src) => {
        const img = document.getElementById('image');
        img.src = src;
    };

    window.addEventListener("paste", (event) => {
        event.preventDefault();
        const onError = (error) => {
            setStatus(error);
        };

        if (event.clipboardData.files.length == 0) {
            onError("error - non-screenshot paste detected.")
            return;
        }
        const f = event.clipboardData.files[0];
        if (f.type != "image/png") {
            onError("error - non-PNG paste detected.")
            return;
        }

        clearFound();

        let total = 0;
        let hasPlayerItems = false;

        const onItemCountReady = (id, count) => {
            if (count > 0) {
                if (items[id].value > 0) {
                    const delta = count * items[id].value;
                    total += delta;
                    addFound(`${items[id].name}: ${count} x ${items[id].value} gp = ${delta} gp`);
                } else {
                    addFound(`${items[id].name}: ${count} x (player trade value)`);
                    hasPlayerItems = true;
                }
            }
        };

        const onCallbackReady = (callback) => {
            Object.entries(items).forEach(([_, item]) => {
                setStatus(`processing ${item.name}...`);
                callback(onItemCountReady, onError, item.id);
            });
        };

        const onImageReady = (imgBytes) => {
            setImageSource(window.URL.createObjectURL(new Blob([imgBytes], { type: "image/png" })));
            setStatus(`processing...`);

            setTimeout(() => {
                const start = performance.now();
                tlootWASM.processImage(onCallbackReady, onError, imgBytes);
                setStatus(`processing took ${((performance.now() - start) / 1000).toPrecision(2)}s.`);

                if (hasPlayerItems) {
                    addFound(`Total: ${total} gp(plus player trade items).`);
                } else {
                    addFound(`Total: ${total} gp.`);
                }
            }, 50);
        }

        f.bytes().then(onImageReady);
    });
};

const go = new Go();
WebAssembly.instantiateStreaming(fetch("main.wasm"), go.importObject).then((result) => {
    go.run(result.instance);
});