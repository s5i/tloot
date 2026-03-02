tlootWASM = {
    setStatus: (s) => {
        let status = `Status: ${s}`;
        console.log(status);
        document.getElementById('status').textContent = status;
    },
    setError: (s) => {
        let status = `Error: ${s}`;
        console.log(status);
        document.getElementById('status').textContent = status;
    },
    clearFound: () => {
        document.getElementById('found').innerHTML = "";
    },
    addFound: (text, bold = false) => {
        const found = document.getElementById('found');
        const line = document.createElement('div');
        line.innerText = text;
        if (bold) {
            line.classList.add('bold');
        }
        found.appendChild(line);
    },
    setImageSource: (src) => {
        const img = document.getElementById('image');
        img.src = src;
    },
    getItemName: (id) => {
        return tlootWASM.items[id].name;
    },
    getItemValue: (id) => {
        return tlootWASM.items[id].value;
    },
    getItemCategory: (id) => {
        return tlootWASM.items[id].category;
    },
    items: {},
};

tlootWASM.onReady = () => {
    const itemsRet = tlootWASM.getItems();
    if (itemsRet.error) {
        tlootWASM.setError(`getItems: ${itemsRet.error}`);
        return
    }
    tlootWASM.items = itemsRet.result;
    console.log(tlootWASM.items);

    window.addEventListener("paste", (event) => {
        event.preventDefault();

        if (event.clipboardData.files.length == 0) {
            tlootWASM.setError("non-screenshot paste detected.")
            return;
        }

        const f = event.clipboardData.files[0];
        if (f.type != "image/png") {
            tlootWASM.setError("non-PNG paste detected.")
            return;
        }

        const getProcessor = (imgBytes) => {
            return new Promise(function (resolve, reject) {
                const imageProcessorRet = tlootWASM.getImageProcessor(imgBytes);
                if (imageProcessorRet.error) {
                    reject(`getImageProcessor: ${imageProcessorRet.error}`);
                    return
                }
                resolve(imageProcessorRet.result);
            });
        }

        let processSingleItem = (handler, item) => {
            return new Promise(function (resolve, reject) {
                tlootWASM.setStatus(`processing ${item.name}...`);

                const processRet = handler(item.id);
                if (processRet.error) {
                    reject(`processSingleItem: ${processRet.error}`);
                    return
                }

                const r = processRet.result;
                const id = r.id;
                const count = r.count;
                const name = tlootWASM.getItemName(id);
                const value = tlootWASM.getItemValue(id);

                if (count > 0) {
                    if (value > 0) {
                        tlootWASM.addFound(`${name}: ${count} x ${value} gp = ${count * value} gp`);
                    } else {
                        tlootWASM.addFound(`${name}: ${count} x (player trade value)`);
                    }
                }

                resolve(r);
            });
        };

        let processAllItems = (handler) => {
            let promises = [];
            Object.entries(tlootWASM.items).forEach(([_, item]) => {
                promises.push(processSingleItem(handler, item));
            });

            return Promise.all(promises);
        }

        let mergeResults = (results) => {
            return new Promise(function (resolve, reject) {
                let total = 0;
                let hasPlayerItems = false;

                for (r of results) {
                    const id = r.id;
                    const count = r.count;
                    const value = tlootWASM.getItemValue(id);

                    total += count * value;

                    if (count > 0 && value <= 0) {
                        hasPlayerItems = true;
                    }
                }

                if (hasPlayerItems) {
                    tlootWASM.addFound(`Total: ${total} gp (plus player value).`, true);
                } else {
                    tlootWASM.addFound(`Total: ${total} gp.`, true);
                }

                resolve();
            });
        };

        f.bytes().then((imgBytes) => {
            tlootWASM.setImageSource(window.URL.createObjectURL(new Blob([imgBytes], { type: "image/png" })));
            tlootWASM.clearFound();
            tlootWASM.setStatus(`processing...`);

            setTimeout(() => {
                const start = performance.now();
                getProcessor(imgBytes)
                    .then(processAllItems)
                    .then(mergeResults)
                    .then(() => { tlootWASM.setStatus(`processing took ${((performance.now() - start) / 1000).toPrecision(2)}s.`); })
                    .catch(err => { tlootWASM.setError(err); });
            }, 50);
        });
    });
};

const go = new Go();
WebAssembly.instantiateStreaming(fetch("main.wasm"), go.importObject).then((result) => {
    go.run(result.instance);
});