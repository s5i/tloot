tlootWASM = {};
tlootWASM.onReady = () => {
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

    const itemsRet = tlootWASM.getItems();
    if (itemsRet.error) {
        setStatus(`getItems error: ${itemsRet.error}`);
        return
    }
    const items = itemsRet.result;

    window.addEventListener("paste", (event) => {
        event.preventDefault();

        if (event.clipboardData.files.length == 0) {
            setStatus("error - non-screenshot paste detected.")
            return;
        }

        const f = event.clipboardData.files[0];
        if (f.type != "image/png") {
            setStatus("error - non-PNG paste detected.")
            return;
        }

        f.bytes().then((imgBytes) => {
            setImageSource(window.URL.createObjectURL(new Blob([imgBytes], { type: "image/png" })));
            clearFound();
            setStatus(`processing...`);

            const start = performance.now();
            const imageProcessorRet = tlootWASM.getImageProcessor(imgBytes);
            if (imageProcessorRet.error) {
                setStatus(`getImageProcessor error: ${imageProcessorRet.error}`);
                return
            }
            const process = imageProcessorRet.result;

            let total = 0;
            let hasPlayerItems = false;

            Object.entries(items).forEach(([_, item]) => {
                setStatus(`processing ${item.name}...`);
                const processRet = process(item.id);
                if (processRet.error) {
                    setStatus(`process error: ${processRet.error}`);
                    return
                }

                const r = processRet.result;
                if (r.count > 0) {
                    if (items[r.id].value > 0) {
                        const delta = r.count * items[r.id].value;
                        total += delta;
                        addFound(`${items[r.id].name}: ${r.count} x ${items[r.id].value} gp = ${delta} gp`);
                    } else {
                        addFound(`${items[r.id].name}: ${r.count} x (player trade value)`);
                        hasPlayerItems = true;
                    }
                }
            });

            setStatus(`processing took ${((performance.now() - start) / 1000).toPrecision(2)}s.`);

            if (hasPlayerItems) {
                addFound(`Total: ${total} gp(plus player trade items).`);
            } else {
                addFound(`Total: ${total} gp.`);
            }
        });
    });
};

const go = new Go();
WebAssembly.instantiateStreaming(fetch("main.wasm"), go.importObject).then((result) => {
    go.run(result.instance);
});