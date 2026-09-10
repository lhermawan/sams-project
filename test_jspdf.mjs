import { jsPDF } from "jspdf";
import "jspdf-autotable";
const doc = new jsPDF();
doc.text("Hello world!", 10, 10);
const buffer = doc.output('arraybuffer');
console.log("PDF size:", buffer.byteLength);
