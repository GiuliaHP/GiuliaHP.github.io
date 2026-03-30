function SaveFile(byteArray, length, fileName) {
    var blob = new Blob([new Uint8Array(byteArray, 0, length)], { type: "application/octet-stream" });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
