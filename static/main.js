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
    getItemEnabled: (id) => {
        return document.getElementById(`${id}_enabled`).checked;
    },
    getItemValue: (id) => {
        return document.getElementById(`${id}_value`).value;
    },
    loadItemSettings: () => {
        const items = tlootWASM.items;

        const categories = Object.fromEntries(
            Object.values(items)
                .map((item) => item.category)
                .filter((v, idx, arr) => { return arr.indexOf(v) === idx; })
                .sort()
                .map((category) => [
                    category,
                    Object.values(items)
                        .filter((v) => { return v.category === category; })
                        .sort((a, b) => a.name == b.name ? 0 : a.name < b.name ? -1 : 1)
                        .map((item) => item.id),
                ])
        );

        const settingsParent = document.getElementById('itemSettings');
        settingsParent.innerHTML = '';

        Object.entries(categories).forEach(([category, ids]) => {
            const cDiv = document.createElement('div');
            cDiv.classList.add('item-category')
            settingsParent.appendChild(cDiv);

            const headerDiv = document.createElement('div');
            headerDiv.classList.add('category-header');
            cDiv.appendChild(headerDiv);

            const tDiv = document.createElement('div');
            tDiv.classList.add('bold');
            tDiv.classList.add('no-select');
            tDiv.innerText = category;
            headerDiv.appendChild(tDiv);

            const btnDiv = document.createElement('div');
            btnDiv.classList.add('category-buttons');
            headerDiv.appendChild(btnDiv);

            const enableBtn = document.createElement('button');
            enableBtn.textContent = 'Enable';
            enableBtn.addEventListener('click', () => tlootWASM.setCategoryEnabled(ids, true));
            btnDiv.appendChild(enableBtn);

            const disableBtn = document.createElement('button');
            disableBtn.textContent = 'Disable';
            disableBtn.addEventListener('click', () => tlootWASM.setCategoryEnabled(ids, false));
            btnDiv.appendChild(disableBtn);

            ids.forEach((id) => {
                const iDiv = document.createElement('div');
                iDiv.classList.add('item-item');
                cDiv.appendChild(iDiv);

                const lSpan = document.createElement('span');
                const rSpan = document.createElement('span');
                lSpan.classList.add('item-colspan');
                rSpan.classList.add('item-colspan');
                iDiv.appendChild(lSpan);
                iDiv.appendChild(rSpan);

                const iChk = document.createElement('input');
                iChk.type = 'checkbox';
                iChk.id = `${id}_enabled`;
                let enabled = window.localStorage.getItem(iChk.id);
                if (enabled === null) {
                    enabled = items[id].enabled;
                }
                iChk.checked = !!Number(enabled);
                iChk.classList.add('stored-enabled');
                iChk.addEventListener("change", (event) => {
                    window.localStorage.setItem(event.target.id, +event.target.checked);
                })
                lSpan.appendChild(iChk);

                const iTxt = document.createElement('label');
                iTxt.innerText = items[id].name;
                iTxt.htmlFor = iChk.id;
                iTxt.classList.add('no-select');
                lSpan.appendChild(iTxt);

                const iVal = document.createElement('input');
                iVal.type = 'number';
                iVal.id = `${id}_value`;
                let value = window.localStorage.getItem(iVal.id);
                if (value === null) {
                    value = Number(items[id].value);
                }
                iVal.value = value;
                iVal.classList.add('item-value');
                iVal.classList.add('stored-price');
                iVal.addEventListener("change", (event) => {
                    window.localStorage.setItem(event.target.id, event.target.value);
                })
                rSpan.appendChild(iVal);
            });
        });
    },
    setAllEnabled: (enabled) => {
        document.querySelectorAll('.stored-enabled').forEach((chk) => {
            chk.checked = enabled;
            window.localStorage.setItem(chk.id, +chk.checked);
        });
    },
    setCategoryEnabled: (ids, enabled) => {
        ids.forEach((id) => {
            const chk = document.getElementById(`${id}_enabled`);
            chk.checked = enabled;
            window.localStorage.setItem(chk.id, +chk.checked);
        });
    },
    resetPrices: () => {
        document.querySelectorAll('.stored-price').forEach((input) => {
            const id = input.id.replace('_value', '');
            input.value = Number(tlootWASM.items[id].value);
            window.localStorage.removeItem(input.id);
        });
    },
    resetEnabled: () => {
        document.querySelectorAll('.stored-enabled').forEach((input) => {
            const id = input.id.replace('_enabled', '');
            input.checked = Number(tlootWASM.items[id].enabled);
            window.localStorage.removeItem(input.id);
        });
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

    tlootWASM.loadItemSettings();
    document.getElementById('resetEnabled').addEventListener('click', tlootWASM.resetEnabled);
    document.getElementById('enableAll').addEventListener('click', () => tlootWASM.setAllEnabled(true));
    document.getElementById('disableAll').addEventListener('click', () => tlootWASM.setAllEnabled(false));
    document.getElementById('resetPrices').addEventListener('click', tlootWASM.resetPrices);

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
                if (tlootWASM.getItemEnabled(item.id)) {
                    promises.push(processSingleItem(handler, item));
                }
            });

            return Promise.all(promises);
        }

        let mergeResults = (results) => {
            return new Promise(function (resolve, reject) {
                let totalCount = 0;
                let totalValue = 0;
                let hasPlayerItems = false;

                for (r of results) {
                    const id = r.id;
                    const count = r.count;
                    const value = tlootWASM.getItemValue(id);

                    totalCount += count;
                    totalValue += count * value;

                    if (count > 0 && value <= 0) {
                        hasPlayerItems = true;
                    }
                }

                if (hasPlayerItems) {
                    tlootWASM.addFound(`Total: ${totalCount} items worth ${totalValue} gp (plus player value).`, true);
                } else {
                    tlootWASM.addFound(`Total: ${totalCount} items worth ${totalValue} gp.`, true);
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