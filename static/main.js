tlootWASM = {
    ready: false,
    items: {},
    onReady: () => {
        const itemsResponse = tlootWASM.getItems();
        if (itemsResponse.error) {
            tloot.setError(`getItems: ${itemsResponse.error}`);
            return;
        }

        tlootWASM.items = itemsResponse.result;
        tlootWASM.ready = true;
        tloot.loadItemSettings();
    },
    checkReady: () => {
        if (!tlootWASM.ready) {
            tloot.setError('WASM not ready.');
        }
        return tlootWASM.ready;
    },
};

tloot = {
    pasteEnabled: true,
    screenshotId: 0,
    found: {},

    addDOMElement: (parent, type, classes) => {
        const ret = document.createElement(type);
        if (classes) {
            classes.forEach((c) => {
                ret.classList.add(c);
            });
        }
        parent.appendChild(ret);
        return ret;
    },
    setStatus: (s) => {
        let status = `Status: ${s}`;
        document.getElementById('status').textContent = status;
    },
    setError: (s) => {
        let status = `Error: ${s}`;
        console.log(status);
        document.getElementById('status').textContent = status;
    },
    addFound: (screenshot_id, item_id, count) => {
        if (!(screenshot_id in tloot.found)) {
            tloot.found[screenshot_id] = {};
        }
        if (!(item_id in tloot.found[screenshot_id])) {
            tloot.found[screenshot_id][item_id] = 0;
        }
        tloot.found[screenshot_id][item_id] += count;
        tloot.refreshFound();
    },
    refreshFound: () => {
        const found = document.getElementById('found');
        found.innerHTML = '';
        let totalCount = 0;
        let totalValue = 0;

        Object.entries(tloot.found).forEach(([screenshot_id, counts]) => {
            let scrCount = 0;
            let scrValue = 0;

            const line = tloot.addDOMElement(found, 'div', ['bold']);
            line.innerText = `Screenshot #${Number(screenshot_id) + 1}:`;

            Object.entries(counts).forEach(([item_id, count]) => {
                const name = tloot.getItemName(item_id);
                const value = tloot.getItemValue(item_id);
                const ctVal = count * value;

                scrCount += count;
                totalCount += count;
                scrValue += ctVal;
                totalValue += ctVal;

                const line = tloot.addDOMElement(found, 'div');
                line.innerText = `${name}: ${count} x ${value} gp = ${ctVal} gp`;
            });


            const scrResult = tloot.addDOMElement(found, 'div', ['bold']);
            scrResult.innerText = `Screenshot value: ${scrValue}`;

            tloot.addDOMElement(found, 'hr');
        });

        const totalResult = tloot.addDOMElement(found, 'div', ['bold']);
        totalResult.innerText = `Total value: ${totalValue}`;
    },
    hideExampleImage: (src) => {
        const img = document.getElementById('exampleImage');
        img.setAttribute('hidden', true);
    },
    addImage: (src) => {
        const img = tloot.addDOMElement(document.getElementById('images'), 'img');
        img.src = src;
    },
    getItemName: (id) => {
        const items = tlootWASM.items;
        return items[id].name;
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

        const root = document.getElementById('itemSettings');
        root.innerHTML = '';

        const navDiv = tloot.addDOMElement(root, 'div', ['category-nav']);
        const contentDiv = tloot.addDOMElement(root, 'div', ['category-content']);

        const selectCategory = (navItem, cDiv) => {
            navDiv.querySelectorAll('.category-nav-item').forEach((el) => el.classList.remove('active'));
            contentDiv.querySelectorAll('.item-category').forEach((el) => el.classList.remove('active'));
            navItem.classList.add('active');
            cDiv.classList.add('active');
        };

        let firstNavItem = null;
        let firstCDiv = null;

        Object.entries(categories).forEach(([category, ids]) => {
            const cDiv = tloot.addDOMElement(contentDiv, 'div', ['item-category']);
            const navItem = tloot.addDOMElement(navDiv, 'div', ['category-nav-item']);
            navItem.innerText = category;
            navItem.addEventListener('click', () => selectCategory(navItem, cDiv));

            if (!firstNavItem) {
                firstNavItem = navItem;
                firstCDiv = cDiv;
            }

            const headerDiv = tloot.addDOMElement(cDiv, 'div', ['category-header']);
            const btnDiv = tloot.addDOMElement(headerDiv, 'div', ['category-buttons']);

            const enableBtn = tloot.addDOMElement(btnDiv, 'button');
            enableBtn.textContent = `Enable ${category}`;
            enableBtn.addEventListener('click', () => tloot.setCategoryEnabled(ids, true));

            const disableBtn = tloot.addDOMElement(btnDiv, 'button');
            disableBtn.textContent = `Disable ${category}`;
            disableBtn.addEventListener('click', () => tloot.setCategoryEnabled(ids, false));

            const hrDiv = tloot.addDOMElement(cDiv, 'div');
            tloot.addDOMElement(hrDiv, 'hr');

            ids.forEach((id) => {
                const iDiv = tloot.addDOMElement(cDiv, 'div', ['item-item']);
                const lSpan = tloot.addDOMElement(iDiv, 'span', ['item-colspan']);
                const rSpan = tloot.addDOMElement(iDiv, 'span', ['item-colspan']);

                const iChk = tloot.addDOMElement(lSpan, 'input', ['stored-enabled']);
                iChk.id = `${id}_enabled`;
                iChk.type = 'checkbox';
                iChk.checked = !items[id].forceDisabled && !!Number(window.localStorage.getItem(iChk.id) || items[id].enabled);
                iChk.disabled = items[id].forceDisabled;
                iChk.addEventListener("change", (event) => {
                    window.localStorage.setItem(event.target.id, +event.target.checked);
                });

                const iTxt = tloot.addDOMElement(lSpan, 'label', ['no-select']);
                iTxt.innerText = items[id].name;
                iTxt.htmlFor = iChk.id;

                const iVal = tloot.addDOMElement(rSpan, 'input', ['item-value', 'stored-price']);
                iVal.id = `${id}_value`;
                iVal.type = 'number';
                iVal.value = Number(window.localStorage.getItem(iVal.id) || items[id].value);
                if (items[id].market) {
                    iVal.classList.add('market-value');
                }
                if (iVal.value != Number(items[id].value)) {
                    iVal.classList.add('modified-value');
                }
                iVal.addEventListener("change", (event) => {
                    window.localStorage.setItem(event.target.id, event.target.value);
                    if (event.target.value != Number(items[id].value)) {
                        iVal.classList.add('modified-value');
                    } else {
                        iVal.classList.remove('modified-value');
                    }
                    tloot.refreshFound();
                });
            });
        });

        if (firstNavItem) {
            selectCategory(firstNavItem, firstCDiv);
        }
    },
    setAllEnabled: (enabled) => {
        const items = tlootWASM.items;
        document.querySelectorAll('.stored-enabled').forEach((chk) => {
            const id = chk.id.replace('_enabled', '');
            if (items[id].forceDisabled) {
                return;
            }

            chk.checked = enabled;
            window.localStorage.setItem(chk.id, +chk.checked);
        });
    },
    setCategoryEnabled: (ids, enabled) => {
        const items = tlootWASM.items;
        ids.forEach((id) => {
            if (items[id].forceDisabled) {
                return;
            }

            const chk = document.getElementById(`${id}_enabled`);
            chk.checked = enabled;
            window.localStorage.setItem(chk.id, +chk.checked);
        });
    },
    resetPrices: () => {
        document.querySelectorAll('.stored-price').forEach((input) => {
            const items = tlootWASM.items;
            const id = input.id.replace('_value', '');
            input.value = Number(items[id].value);
            window.localStorage.removeItem(input.id);
            input.classList.remove('modified-value');
        });
        tloot.refreshFound();
    },
};

const go = new Go();
WebAssembly.instantiateStreaming(fetch("main.wasm"), go.importObject).then((result) => {
    go.run(result.instance);
});

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

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('enableAll').addEventListener('click', () => {
        if (!tlootWASM.checkReady()) {
            return;
        }

        tloot.setAllEnabled(true);
    });

    document.getElementById('disableAll').addEventListener('click', () => {
        if (!tlootWASM.checkReady()) {
            return;
        }
        tloot.setAllEnabled(false);
    });

    document.getElementById('resetPrices').addEventListener('click', () => {
        if (!tlootWASM.checkReady()) {
            return;
        }

        tloot.resetPrices();
    });

    window.addEventListener("paste", (event) => {
        event.preventDefault();

        if (!tlootWASM.checkReady()) {
            return;
        }

        if (!tloot.pasteEnabled) {
            return;
        }

        tloot.pasteEnabled = false;

        if (event.clipboardData.files.length == 0) {
            tloot.setError("non-screenshot paste detected.")
            tloot.pasteEnabled = true;
            return;
        }

        const f = event.clipboardData.files[0];
        if (f.type != "image/png") {
            tloot.setError("non-PNG paste detected.")
            tloot.pasteEnabled = true;
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
                    tloot.addFound(tloot.screenshotId, item_id, count);
                }

                resolve(r);
            });
        };

        let processAllItems = (handler) => {
            const items = tlootWASM.items;
            let promise = new Promise(function (resolve) { resolve([]); });
            let toProcess = 0;
            let processed = 0;
            Object.entries(items).forEach(([_, item]) => {
                if (tloot.getItemEnabled(item.id)) {
                    toProcess++;
                    promise = new Promise(function (resolve, reject) {
                        promise.then((results) => {
                            setTimeout(() => {
                                tloot.setStatus(`${Math.floor(processed / toProcess * 100)}% - processing ${item.name}...`);
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
            tloot.hideExampleImage();
            tloot.addImage(window.URL.createObjectURL(new Blob([imgBytes], { type: "image/png" })));
            tloot.setStatus(`processing...`);

            setTimeout(() => {
                const start = performance.now();
                getProcessor(imgBytes)
                    .then(processAllItems)
                    .then(() => {
                        tloot.setStatus(`processing took ${((performance.now() - start) / 1000).toPrecision(2)}s.`);
                    })
                    .catch(err => { tloot.setError(err); })
                    .finally(() => {
                        tloot.screenshotId++;
                        tloot.pasteEnabled = true;
                    });
            }, 50);
        });
    });
});