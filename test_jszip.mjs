import JSZip from "jszip";
const zip = new JSZip();
zip.file("hello.txt", "Hello World\n");
const content = await zip.generateAsync({type:"nodebuffer"});
console.log("ZIP size:", content.length);
