document.addEventListener("DOMContentLoaded", function () {
    const dropZone = document.getElementById("drop-zone");
    const fileList = document.getElementById("file-list");
    const convertButton = document.getElementById("convert-button");
    const fileInput = document.getElementById("file-upload");

    let filesArray = [];
    let letterCon = [];
    let bufferCon = [];
    let convertedFiles = [];

    // Prevent default drag behaviors
    ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when dragging over it
    ["dragenter", "dragover"].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ["dragleave", "drop"].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropZone.addEventListener("drop", handleDrop, false);

    fileInput.addEventListener("change", function () {
        handleFiles(this.files);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropZone.style.background = "#e1e7f0";
    }

    function unhighlight() {
        dropZone.style.background = "#f0f0f0";
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        [...files].forEach(file => {
            if (!filesArray.includes(file)) {
                filesArray.push(file);
                uploadFile(file);
            }
        });
        toggleConvertButton();
        toggleMargin();
        preConvertUpdate();
    }

    function uploadFile(file) {
        const formData = new FormData();
        formData.append("file", file);

        const fileItem = document.createElement("div");
        fileItem.setAttribute("id", "file_item");
        fileItem.innerHTML = `<p class='file_name'>${file.name}</p>`;

        const deleteButton = document.createElement("img");
        deleteButton.setAttribute("id", "delete");
        deleteButton.src = "assets/delete.svg";
        fileItem.appendChild(deleteButton);

        fileList.appendChild(fileItem);

        fileItem.querySelector("#delete").addEventListener("click", () => {
            fileItem.remove();
            filesArray = filesArray.filter(f => f !== file);
            toggleConvertButton();
            toggleMargin();
            preConvertUpdate(); //making sure it updates when files are removed
        });
        

    }

    function toggleConvertButton() {
        if (filesArray.length > 0) {
            convertButton.style.display = "block";
        } else {
            convertButton.style.display = "none";
        }
    }

    function toggleMargin() {
        if (filesArray.length > 0) {
            document.getElementById('file-list').style.marginTop = '48px';
        } else {
            document.getElementById('file-list').style.marginTop = '0px';
        }
    }

    function preConvertUpdate() {
        bufferCon = [];
        letterCon = [];

        for (let i = 0; i < filesArray.length; i++) {
            bufferCon[i] = filesArray[i].arrayBuffer();

            bufferCon[i].then(data => {
                let font = opentype.parse(data);
                letterCon[i] = font;
            });
        }
    }

    convertButton.addEventListener("click", function () {
        for (let i = 0; i < letterCon.length; i++) {
            convert(letterCon[i]);
        }
        createZipAndDownload();
    });

    function convert(font) {
        let fontToExportArr = [];
        let letterPathCon = [];

        for (let i = 0; i < Object.keys(font.glyphs.glyphs).length; i++) {
            letterPathCon[i] = font.glyphs.glyphs[i].path.commands;
        }

        fontToExportArr = {
            parameters: {
                name: font.names.fullName.en,
                ascender: font.tables.os2.sTypoAscender,
                cap_height: font.tables.os2.sCapHeight,
                x_height: font.tables.os2.sxHeight,
                baseline: 0,
                descender: font.tables.os2.sTypoDescender,
                italic_angle: font.tables.post.italicAngle
            },
            letters: {
                info: font.glyphs.glyphs,
                path: letterPathCon
            }
        };

        let pathConvertedArr = pathConvert(fontToExportArr).letterReconstructedCon;

        for (let i = 0; i < fontToExportArr.length; i++) {
            for (let j = 0; j < Object.entries(fontToExportArr[i].letters.path).length; j++) {
                fontToExportArr[i].letters.path = pathConvertedArr[i];
            }
        }

        const json = "var " + font.names.fullName.en.replace(/ /g, "_") + " = " + JSON.stringify(fontToExportArr);
        const blob = new Blob([json], { type: "application/json" });
        convertedFiles.push({ name: font.names.fullName.en + "_data.js", blob });
    }

    function pathConvert(fontBeforeExport) {
        let letterCon = [];
        let letterReconstructedCon = [];
        let numOfLinesCon = [];
        let lineIndexCon = [];

        for (let i = 0; i < Object.entries(fontBeforeExport.letters.path).length; i++) {
            lineIndexCon[i] = 0;
            numOfLinesCon[i] = 0;

            for (let a = 0; a < Object.entries(fontBeforeExport.letters.path[i]).length; a++) {
                if (fontBeforeExport.letters.path[i][a].type === "Z") {
                    numOfLinesCon[i]++;
                }
            }
        }

        for (let i = 0; i < Object.entries(fontBeforeExport.letters.path).length; i++) {
            letterCon[i] = [];
            letterReconstructedCon[i] = [];

            for (let a = 0; a < numOfLinesCon[i]; a++) {
                letterCon[i][a] = [];
                letterReconstructedCon[i][a] = [];
            }
        }

        for (let i = 0; i < Object.entries(fontBeforeExport.letters.path).length; i++) {
            for (let a = 0; a < fontBeforeExport.letters.path[i].length; a++) {
                if (fontBeforeExport.letters.path[i][a].type !== "Z") {
                    letterCon[i][lineIndexCon[i]].push(fontBeforeExport.letters.path[i][a]);
                } else {
                    letterCon[i][lineIndexCon[i]].push(fontBeforeExport.letters.path[i][a]);
                    lineIndexCon[i]++;
                }
            }
        }

        for (let a = 0; a < letterCon.length; a++) {
            for (let n = 0; n < letterCon[a].length; n++) {
                for (let x = 0; x < letterCon[a][n].length; x++) {
                    letterReconstructedCon[a][n][x] = {};

                    if (letterCon[a][n][x].type === "M") {
                        letterReconstructedCon[a][n][x].x = letterCon[a][n][x].x;
                        letterReconstructedCon[a][n][x].y = letterCon[a][n][x].y;
                        letterReconstructedCon[a][n][x].in_x = letterCon[a][n][x].x;
                        letterReconstructedCon[a][n][x].in_y = letterCon[a][n][x].y;
                        letterReconstructedCon[a][n][x].out_x = letterCon[a][n][x].x;
                        letterReconstructedCon[a][n][x].out_y = letterCon[a][n][x].y;
                    }

                    if (letterCon[a][n][x].type === "C") {
                        if (letterCon[a][n][x + 1].type === "Z") {
                            letterReconstructedCon[a][n][x].x = letterCon[a][n][x].x;
                            letterReconstructedCon[a][n][x].y = letterCon[a][n][x].y;
                            letterReconstructedCon[a][n][x - 1].out_x = letterCon[a][n][x].x1;
                            letterReconstructedCon[a][n][x - 1].out_y = letterCon[a][n][x].y1;

                            if (letterReconstructedCon[a][n][x].x !== letterReconstructedCon[a][n][0].x) {
                                letterReconstructedCon[a][n][x].in_x = letterCon[a][n][x].x2;
                                letterReconstructedCon[a][n][x].in_y = letterCon[a][n][x].y2;
                                letterReconstructedCon[a][n][x].out_x = letterCon[a][n][x].x;
                                letterReconstructedCon[a][n][x].out_y = letterCon[a][n][x].y;
                            } else {
                                letterReconstructedCon[a][n][0].in_x = letterCon[a][n][x].x2;
                                letterReconstructedCon[a][n][0].in_y = letterCon[a][n][x].y2;
                            }
                        } else {
                            letterReconstructedCon[a][n][x].x = letterCon[a][n][x].x;
                            letterReconstructedCon[a][n][x].y = letterCon[a][n][x].y;
                            letterReconstructedCon[a][n][x].in_x = letterCon[a][n][x].x2;
                            letterReconstructedCon[a][n][x].in_y = letterCon[a][n][x].y2;
                            letterReconstructedCon[a][n][x - 1].out_x = letterCon[a][n][x].x1;
                            letterReconstructedCon[a][n][x - 1].out_y = letterCon[a][n][x].y1;
                        }
                    }

                    if (letterCon[a][n][x].type === "L") {
                        if (letterCon[a][n][x - 1].type === "C") {
                            letterReconstructedCon[a][n][x].x = letterCon[a][n][x].x;
                            letterReconstructedCon[a][n][x].y = letterCon[a][n][x].y;
                            letterReconstructedCon[a][n][x].in_x = letterCon[a][n][x].x;
                            letterReconstructedCon[a][n][x].in_y = letterCon[a][n][x].y;
                            letterReconstructedCon[a][n][x - 1].out_x = letterCon[a][n][x].x;
                            letterReconstructedCon[a][n][x - 1].out_y = letterCon[a][n][x].y;
                            letterReconstructedCon[a][n][x].out_x = letterCon[a][n][x].x;
                            letterReconstructedCon[a][n][x].out_y = letterCon[a][n][x].y;
                        } else {
                            letterReconstructedCon[a][n][x].x = letterCon[a][n][x].x;
                            letterReconstructedCon[a][n][x].y = letterCon[a][n][x].y;
                            letterReconstructedCon[a][n][x].in_x = letterCon[a][n][x].x;
                            letterReconstructedCon[a][n][x].in_y = letterCon[a][n][x].y;
                            letterReconstructedCon[a][n][x].out_x = letterCon[a][n][x].x;
                            letterReconstructedCon[a][n][x].out_y = letterCon[a][n][x].y;
                        }
                    }
                }
            }
        }

        for (let a = 0; a < letterCon.length; a++) {
            for (let n = 0; n < letterCon[a].length; n++) {
                if (letterCon[a][n][letterCon[a][n].length - 2].x === letterCon[a][n][0].x && letterCon[a][n][letterCon[a][n].length - 2].y === letterCon[a][n][0].y) {
                    letterReconstructedCon[a][n].splice(-2);
                } else {
                    letterReconstructedCon[a][n].splice(-1);
                }
            }
        }

        let pathNumPropertyCon = [];
        let pointNumPropertyCon = [];

        for (let j = 0; j < letterReconstructedCon.length; j++) {
            pathNumPropertyCon[j] = [];
            pointNumPropertyCon[j] = [];
            for (let k = 0; k < letterReconstructedCon[j].length; k++) {
                pathNumPropertyCon[j].push("path_" + k);
                pointNumPropertyCon[j][k] = [];
                for (let x = 0; x < letterReconstructedCon[j][k].length; x++) {
                    pointNumPropertyCon[j][k].push("p" + x);
                }
            }
        }

        function reformatToPathObj(t) {
            let pathsTest = {};

            for (let i = 0; i < pathNumPropertyCon[t].length; i++) {
                let pathName = pathNumPropertyCon[t][i];
                let pathPoints = {};

                for (let j = 0; j < pointNumPropertyCon[t][i].length; j++) {
                    let pointName = pointNumPropertyCon[t][i][j];
                    pathPoints[pointName] = letterReconstructedCon[t][i][j];
                }

                pathsTest[pathName] = pathPoints;
            }

            return pathsTest;
        }

        let letterPathCon = [];

        for (let i = 0; i < pathNumPropertyCon.length; i++) {
            letterPathCon.push(reformatToPathObj(i));
        }

        return { letterPathCon, letterReconstructedCon };
    }

    function createZipAndDownload() {
        const zip = new JSZip();

        convertedFiles.forEach(file => {
            zip.file(file.name, file.blob);
        });

        zip.generateAsync({ type: "blob" }).then(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "GlyphToCanvas.zip";
            link.click();
        });
    }
});