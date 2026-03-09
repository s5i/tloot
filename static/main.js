new Promise((resolve, reject) => {
    let request = new XMLHttpRequest();
    request.addEventListener("readystatechange", () => {
        if (request.readyState === 4 && request.status === 200) {
            resolve(request.responseText);
        }
    });
    request.open("GET", "/motd.html");
    request.send();
}).then((data) => {
    document.getElementById('motd').innerHTML = data;
}).catch(() => { });

new Promise((resolve, reject) => {
    let request = new XMLHttpRequest();
    request.addEventListener("readystatechange", () => {
        if (request.readyState === 4 && request.status === 200) {
            resolve(request.responseText);
        }
    });
    request.open("GET", "/meta/version");
    request.send();
}).then((data) => {
    document.getElementById('title').innerText = `TLoot ${data}`;
}).catch(() => { });

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
    pasteEnabled: true,
    screenshotId: 0,
    found: {},
    addFound: (screenshot_id, item_id, count) => {
        if (!(screenshot_id in tlootWASM.found)) {
            tlootWASM.found[screenshot_id] = {};
        }
        if (!(item_id in tlootWASM.found[screenshot_id])) {
            tlootWASM.found[screenshot_id][item_id] = 0;
        }
        tlootWASM.found[screenshot_id][item_id] += count;
        tlootWASM.refreshFound();
    },
    refreshFound: () => {
        const found = document.getElementById('found');
        found.innerHTML = '';
        let total = 0;

        Object.entries(tlootWASM.found).forEach(([screenshot_id, counts]) => {
            let screenshotTotal = 0;

            const line = document.createElement('div');
            line.classList.add('bold');
            line.innerText = `Screenshot #${Number(screenshot_id) + 1}:`;
            found.appendChild(line);

            Object.entries(counts).forEach(([item_id, count]) => {
                const line = document.createElement('div');
                const name = tlootWASM.getItemName(item_id);
                const value = tlootWASM.getItemValue(item_id);
                line.innerText = `${name}: ${count} x ${value} gp = ${count * value} gp`;
                found.appendChild(line);

                total += count * value;
                screenshotTotal += count * value;
            });

            const scrTotal = document.createElement('div');
            scrTotal.classList.add('bold');
            scrTotal.innerText = `Screenshot value: ${screenshotTotal}`;
            found.appendChild(scrTotal);

            const sep = document.createElement('hr');
            found.appendChild(sep);
        });

        const grandTotal = document.createElement('div');
        grandTotal.classList.add('bold');
        grandTotal.innerText = `Total value: ${total}`;
        found.appendChild(grandTotal);
    },
    hideExampleImage: (src) => {
        const img = document.getElementById('exampleImage');
        img.setAttribute('hidden', true);
    },
    addImage: (src) => {
        const imgs = document.getElementById('images');
        const img = document.createElement('img');
        img.src = src;
        imgs.appendChild(img);
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

        const navDiv = document.createElement('div');
        navDiv.classList.add('category-nav');
        settingsParent.appendChild(navDiv);

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('category-content');
        settingsParent.appendChild(contentDiv);

        const selectCategory = (navItem, cDiv) => {
            navDiv.querySelectorAll('.category-nav-item').forEach((el) => el.classList.remove('active'));
            contentDiv.querySelectorAll('.item-category').forEach((el) => el.classList.remove('active'));
            navItem.classList.add('active');
            cDiv.classList.add('active');
        };

        let firstNavItem = null;
        let firstCDiv = null;

        Object.entries(categories).forEach(([category, ids]) => {
            const navItem = document.createElement('div');
            navItem.classList.add('category-nav-item');
            navItem.innerText = category;
            navDiv.appendChild(navItem);

            const cDiv = document.createElement('div');
            cDiv.classList.add('item-category');
            contentDiv.appendChild(cDiv);

            navItem.addEventListener('click', () => selectCategory(navItem, cDiv));

            if (!firstNavItem) {
                firstNavItem = navItem;
                firstCDiv = cDiv;
            }

            const headerDiv = document.createElement('div');
            headerDiv.classList.add('category-header');
            cDiv.appendChild(headerDiv);

            const btnDiv = document.createElement('div');
            btnDiv.classList.add('category-buttons');
            headerDiv.appendChild(btnDiv);

            const enableBtn = document.createElement('button');
            enableBtn.textContent = `Enable ${category}`;
            enableBtn.addEventListener('click', () => tlootWASM.setCategoryEnabled(ids, true));
            btnDiv.appendChild(enableBtn);

            const disableBtn = document.createElement('button');
            disableBtn.textContent = `Disable ${category}`;
            disableBtn.addEventListener('click', () => tlootWASM.setCategoryEnabled(ids, false));
            btnDiv.appendChild(disableBtn);

            const hrDiv = document.createElement('div');
            hrDiv.appendChild(document.createElement('hr'));
            cDiv.appendChild(hrDiv);

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
                    enabled = tlootWASM.items[id].enabled;
                }
                if (tlootWASM.items[id].forceDisabled) {
                    enabled = false;
                    iChk.disabled = true;
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
                    value = Number(tlootWASM.items[id].value);
                }
                if (tlootWASM.items[id].market) {
                    iVal.classList.add('market-value');
                }
                if (value != Number(tlootWASM.items[id].value)) {
                    iVal.classList.add('modified-value');
                }
                iVal.value = value;
                iVal.classList.add('item-value');
                iVal.classList.add('stored-price');
                iVal.addEventListener("change", (event) => {
                    window.localStorage.setItem(event.target.id, event.target.value);
                    if (event.target.value != Number(tlootWASM.items[id].value)) {
                        iVal.classList.add('modified-value');
                    } else {
                        iVal.classList.remove('modified-value');
                    }
                    tlootWASM.refreshFound();
                })
                rSpan.appendChild(iVal);
            });
        });

        if (firstNavItem) {
            selectCategory(firstNavItem, firstCDiv);
        }
    },
    setAllEnabled: (enabled) => {
        document.querySelectorAll('.stored-enabled').forEach((chk) => {
            const id = chk.id.replace('_enabled', '');
            if (tlootWASM.items[id].forceDisabled) {
                return;
            }

            chk.checked = enabled;
            window.localStorage.setItem(chk.id, +chk.checked);
        });
    },
    setCategoryEnabled: (ids, enabled) => {
        ids.forEach((id) => {
            if (tlootWASM.items[id].forceDisabled) {
                return;
            }

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
            input.classList.remove('modified-value');
        });
        tlootWASM.refreshFound();
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
    document.getElementById('enableAll').addEventListener('click', () => tlootWASM.setAllEnabled(true));
    document.getElementById('disableAll').addEventListener('click', () => tlootWASM.setAllEnabled(false));
    document.getElementById('resetPrices').addEventListener('click', tlootWASM.resetPrices);

    window.addEventListener("paste", (event) => {
        event.preventDefault();

        if (!tlootWASM.pasteEnabled) {
            return;
        }

        tlootWASM.pasteEnabled = false;

        if (event.clipboardData.files.length == 0) {
            tlootWASM.setError("non-screenshot paste detected.")
            tlootWASM.pasteEnabled = true;
            return;
        }

        const f = event.clipboardData.files[0];
        if (f.type != "image/png") {
            tlootWASM.setError("non-PNG paste detected.")
            tlootWASM.pasteEnabled = true;
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
                const processRet = handler(item.id);
                if (processRet.error) {
                    reject(`processSingleItem: ${processRet.error}`);
                    return
                }

                const r = processRet.result;
                const item_id = r.id;
                const count = r.count;

                if (count > 0) {
                    tlootWASM.addFound(tlootWASM.screenshotId, item_id, count);
                }

                resolve(r);
            });
        };

        let processAllItems = (handler) => {
            let promise = new Promise(function (resolve) { resolve([]); });
            let toProcess = 0;
            let processed = 0;
            Object.entries(tlootWASM.items).forEach(([_, item]) => {
                if (tlootWASM.getItemEnabled(item.id)) {
                    toProcess++;
                    promise = new Promise(function (resolve, reject) {
                        promise.then((results) => {
                            setTimeout(() => {
                                tlootWASM.setStatus(`${Math.floor(processed / toProcess * 100)}% - processing ${item.name}...`);
                                processSingleItem(handler, item)
                                    .then((r) => {
                                        processed++;
                                        results.push(r);
                                        resolve(results);
                                    })
                                    .catch((err) => {
                                        reject(err);
                                    });
                            }, 10);
                        });
                    });
                }
            });

            return promise;
        }

        f.bytes().then((imgBytes) => {
            tlootWASM.hideExampleImage();
            tlootWASM.addImage(window.URL.createObjectURL(new Blob([imgBytes], { type: "image/png" })));
            tlootWASM.setStatus(`processing...`);

            setTimeout(() => {
                const start = performance.now();
                getProcessor(imgBytes)
                    .then(processAllItems)
                    .then(() => {
                        tlootWASM.setStatus(`processing took ${((performance.now() - start) / 1000).toPrecision(2)}s.`);
                    })
                    .catch(err => { tlootWASM.setError(err); })
                    .finally(() => {
                        tlootWASM.screenshotId++;
                        tlootWASM.pasteEnabled = true;
                    });
            }, 50);
        });
    });
};

const go = new Go();
WebAssembly.instantiateStreaming(fetch("main.wasm"), go.importObject).then((result) => {
    go.run(result.instance);
});