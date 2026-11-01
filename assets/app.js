/* arkConvert — browser-side converters. No uploads: files are processed locally.
   CDN libraries are lazy-loaded only when needed, with a clear error if a CDN fails.
   Honest limits: text-based conversions preserve content/order; complex layouts,
   embedded fonts and scanned/image PDFs are NOT claimed pixel-perfect. */
(function(){
"use strict";
var $=function(s,el){return (el||document).querySelector(s)};
var $$=function(s,el){return Array.prototype.slice.call((el||document).querySelectorAll(s))};
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function extOf(n){var p=String(n||"").split(".");return p.length>1?p.pop().toLowerCase():""}
function baseOf(n){return String(n||"file").replace(/\.[^.]+$/,"")}
function fmtSize(b){if(b<1024)return b+" B";if(b<1048576)return (b/1024).toFixed(1)+" KB";return (b/1048576).toFixed(1)+" MB"}
var loaded={};
function loadScript(src){if(loaded[src])return loaded[src];loaded[src]=new Promise(function(res,rej){var s=document.createElement("script");s.src=src;s.onload=function(){res(true)};s.onerror=function(){rej(new Error("Could not load "+src))};document.head.appendChild(s)});return loaded[src]}
function downloadBlob(blob,name){var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000)}
function downloadText(text,name,type){downloadBlob(new Blob([text],{type:type||"text/plain;charset=utf-8"}),name)}

/* ---------- Categories / wheel outputs ---------- */
var CATS={
 document:{label:"Documents",outputs:["PDF","DOCX","TXT","MD","PPTX","JPG","PNG"],hint:"PDF, Word, text, Markdown or PowerPoint"},
 image:{label:"Images",outputs:["PNG","JPG","WEBP","GIF","BMP","AVIF","PDF"],hint:"PNG, JPG, WebP, GIF, BMP, AVIF or PDF"},
 video:{label:"Video & Audio",outputs:["MP3","MP4","MKV"],hint:"MP4, MOV, MKV or WebM video"},
 data:{label:"Data",outputs:["CSV","XLSX","TXT"],hint:"Text, CSV or Excel files"}
};
function canConvert(inp,out){
 inp=inp.toLowerCase();out=out.toLowerCase();
 if(inp===out)return "That is already a "+out.toUpperCase()+" file — choose a different output.";
 var docIn=["pdf","docx","txt","md","pptx"],docOut=["pdf","docx","txt","md","pptx","jpg","png"];
 if(docIn.indexOf(inp)>=0){if(docOut.indexOf(out)<0)return "Documents cannot be converted to "+out.toUpperCase()+" here.";if(inp==="docx"&&out==="pptx")return "Word to PowerPoint is not a direct conversion — convert Word to text first, then text to PPTX.";if(inp==="pptx"&&out==="docx")return "PowerPoint to Word is not a direct conversion — convert PPTX to text first, then text to Word.";if(inp==="pptx"&&out==="jpg")return "PowerPoint to image is not supported yet — convert PPTX to PDF/text first.";if(inp==="docx"&&out==="jpg")return "Word to image is not supported yet — convert Word to PDF first, then PDF to JPG.";return null}
 var imgIn=["png","jpg","jpeg","webp","gif","bmp","avif","heic","heif","tif","tiff"],imgOut=["png","jpg","webp","gif","bmp","avif","pdf"];
 if(imgIn.indexOf(inp)>=0){if(imgOut.indexOf(out)<0)return "Images cannot be converted to "+out.toUpperCase()+" here.";return null}
 var vidIn=["mp4","mov","mkv","webm","avi"],vidOut=["mp3","mp4","mkv"];
 if(vidIn.indexOf(inp)>=0){if(vidOut.indexOf(out)<0)return "Video cannot be converted to "+out.toUpperCase()+" here.";if(out==="mp3"&&vidIn.indexOf(inp)<0)return null;return null}
 var datIn=["txt","csv","xlsx","xls"],datOut=["csv","xlsx","txt"];
 if(datIn.indexOf(inp)>=0){if(datOut.indexOf(out)<0)return "Data files cannot be converted to "+out.toUpperCase()+" here.";return null}
 return "Unsupported input type: ."+inp+". Try a PDF, Word, image, video, text, CSV or Excel file.";
}

/* ---------- Small builders (no fragile DOCX lib) ---------- */
function docxXmlFromText(text){
 var paras=String(text).split(/\r?\n/).map(function(line){
  var t=esc(line);var style=line.indexOf("# ")===0?"Heading1":line.indexOf("## ")===0?"Heading2":"";
  var clean=t.replace(/^#{1,2} /,"");
  return style?'<w:p><w:pPr><w:pStyle w:val="'+style+'"/></w:pPr><w:r><w:t xml:space="preserve">'+clean+"</w:t></w:r></w:p>":'<w:p><w:r><w:t xml:space="preserve">'+t+"</w:t></w:r></w:p>";
 }).join("");
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+paras+"</w:body></w:document>";
}
function makeDocxBlob(text){
 return loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js").then(function(){
  var zip=new JSZip();
  zip.file("[Content_Types].xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.folder("_rels").file(".rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.folder("word").file("document.xml",docxXmlFromText(text));
  return zip.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
 });
}
function makePdfBlob(text){
 return loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js").then(function(){
  var JSPDF=window.jspdf&&window.jspdf.jsPDF;if(!JSPDF)throw new Error("PDF library did not load. Check your connection and try again.");
  var doc=new JSPDF();var lines=doc.splitTextToSize(String(text),170);var y=15;
  lines.forEach(function(line){if(y>275){doc.addPage();y=15}doc.text(line,15,y);y+=7});
  return doc.output("blob");
 });
}
function makePptxBlob(text){
 return loadScript("https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js").then(function(){
  if(!window.PptxGenJS)throw new Error("PowerPoint library did not load. Check your connection and try again.");
  var pptx=new window.PptxGenJS();var chunks=String(text).split(/\n\s*\n/);if(!chunks.length)chunks=[text];
  chunks.slice(0,60).forEach(function(chunk,i){var s=pptx.addSlide();var lines=chunk.split(/\n/);var title=lines[0]||("Slide "+(i+1));s.addText(title,{x:0.5,y:0.4,w:9,h:0.8,fontSize:24,bold:true,color:"0B223D"});if(lines.length>1)s.addText(lines.slice(1).join("\n"),{x:0.5,y:1.4,w:9,h:4,fontSize:16,color:"333333"})});
  return pptx.write({outputType:"blob"});
 });
}
function mdFromText(text){
 return String(text).split(/\r?\n/).map(function(l){return l.trim()?l:""}).join("\n");
}

/* ---------- Document converters ---------- */
function pdfToText(data){
 return loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js").then(function(){
  if(!window.pdfjsLib)throw new Error("PDF library did not load.");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return window.pdfjsLib.getDocument({data:data}).promise;
 }).then(function(pdf){
  var jobs=[];for(var i=1;i<=pdf.numPages;i++)jobs.push(pdf.getPage(i).then(function(p){return p.getTextContent().then(function(tc){var out="";tc.items.forEach(function(it){out+=it.str+(it.hasEOL?"\n":" ")});return out})}));
  return Promise.all(jobs).then(function(pages){return pages.join("\n\n")});
 });
}
function pdfToImages(data,format){
 return loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js").then(function(){
  if(!window.pdfjsLib)throw new Error("PDF library did not load.");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return window.pdfjsLib.getDocument({data:data}).promise;
 }).then(function(pdf){
  var jobs=[];for(var i=1;i<=pdf.numPages;i++)jobs.push(pdf.getPage(i).then(function(page){var vp=page.getViewport({scale:2});var c=document.createElement("canvas");c.width=vp.width;c.height=vp.height;return page.render({canvasContext:c.getContext("2d"),viewport:vp}).promise.then(function(){return new Promise(function(res,rej){c.toBlob(function(b){b?res(b):rej(new Error("Could not render this PDF page as an image."))},format==="jpg"?"image/jpeg":"image/png",0.92)})})}));
  return Promise.all(jobs);
 });
}
function docxConvert(data,mode){
 return loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js").then(function(){
  if(!window.mammoth)throw new Error("Word library did not load.");
  if(mode==="md")return window.mammoth.convertToMarkdown({arrayBuffer:data}).then(function(r){return r.value});
  return window.mammoth.extractRawText({arrayBuffer:data}).then(function(r){return r.value});
 });
}
function pptxToText(data){
 return loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js").then(function(){
  return JSZip.loadAsync(data);
 }).then(function(zip){
  var names=Object.keys(zip.files).filter(function(n){return /^ppt\/slides\/slide\d+\.xml$/.test(n)}).sort();
  var jobs=names.map(function(n){return zip.file(n).async("string").then(function(xml){var m=xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g)||[];return m.map(function(x){return x.replace(/<[^>]+>/g,"")}).join(" ")})});
  return Promise.all(jobs).then(function(slides){return slides.join("\n\n")});
 });
}

/* ---------- Image converters ---------- */
function loadImageBlob(blob){
 return new Promise(function(res,rej){var url=URL.createObjectURL(blob);var img=new Image();img.onload=function(){URL.revokeObjectURL(url);res(img)};img.onerror=function(){URL.revokeObjectURL(url);rej(new Error("This image could not be decoded in your browser."))};img.src=url});
}
function imageConvert(file,out){
 var inp=extOf(file.name);
 var work=Promise.resolve(file);
 if(inp==="heic"||inp==="heif"){
  work=loadScript("https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js").then(function(){
   if(!window.heic2any)throw new Error("HEIC decoder did not load.");
   return window.heic2any({blob:file,toType:"image/png"});
  }).catch(function(){throw new Error("HEIC could not be decoded in this browser. On iPhone/iPad, open the photo in Safari, or export it as JPG/PNG first and try again.")});
 }
 return work.then(function(blob){
  if(out==="pdf"){return loadImageBlob(blob).then(function(img){return loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js").then(function(){var JSPDF=window.jspdf.jsPDF;var doc=new JSPDF({unit:"px",format:[img.width,img.height]});var c=document.createElement("canvas");c.width=img.width;c.height=img.height;c.getContext("2d").drawImage(img,0,0);return new Promise(function(res){c.toBlob(function(b){var r=new FileReader();r.onload=function(){doc.addImage(r.result,"JPEG",0,0,img.width,img.height);res(doc.output("blob"))};r.readAsDataURL(b)},"image/jpeg",0.92)})})})}
  return loadImageBlob(blob).then(function(img){
   var c=document.createElement("canvas");c.width=img.width;c.height=img.height;var ctx=c.getContext("2d");
   if(out==="jpg"){ctx.fillStyle="#ffffff";ctx.fillRect(0,0,c.width,c.height)}
   ctx.drawImage(img,0,0);
   var mime={png:"image/png",jpg:"image/jpeg",webp:"image/webp",gif:"image/gif",bmp:"image/bmp",avif:"image/avif"}[out];
   return new Promise(function(res,rej){c.toBlob(function(b){if(b)res(b);else rej(new Error(out.toUpperCase()+" encoding is not supported in this browser. Try PNG or WebP instead."))},mime,0.92)});
  });
 });
}

/* ---------- Data converters ---------- */
function ensureXlsx(){return loadScript("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js").then(function(){if(!window.XLSX)throw new Error("Spreadsheet library did not load.")})}
function csvParse(text){
 var rows=[],row=[],cur="",q=false;for(var i=0;i<text.length;i++){var ch=text[i];if(q){if(ch==='"'){if(text[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}else if(ch==='"')q=true;else if(ch===","){row.push(cur);cur=""}else if(ch==="\n"){row.push(cur);rows.push(row);row=[];cur=""}else if(ch!=="\r")cur+=ch}
 if(cur!==""||row.length){row.push(cur);rows.push(row)}return rows;
}
function csvEscape(v){v=String(v==null?"":v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function dataConvert(file,out,buf,text){
 var inp=extOf(file.name);
 if(inp==="txt"&&out==="csv"){
  var lines=String(text).split(/\r?\n/).filter(function(l){return l.trim()});
  var csv=lines.map(function(l){var parts=l.split(/\t|,/);return parts.map(csvEscape).join(",")}).join("\n");
  return Promise.resolve(new Blob([csv],{type:"text/csv"}));
 }
 if(inp==="txt"&&out==="xlsx"){
  return ensureXlsx().then(function(){var rows=String(text).split(/\r?\n/).map(function(l){return l.split(/\t/)});var ws=XLSX.utils.aoa_to_sheet(rows);var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Sheet1");return new Blob([XLSX.write(wb,{bookType:"xlsx",type:"array"})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})});
 }
 if(inp==="csv"&&out==="xlsx"){return ensureXlsx().then(function(){var wb=XLSX.read(text,{type:"string"});return new Blob([XLSX.write(wb,{bookType:"xlsx",type:"array"})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})})}
 if(inp==="csv"&&out==="txt"){return Promise.resolve(new Blob([text],{type:"text/plain"}))}
 if((inp==="xlsx"||inp==="xls")&&out==="csv"){return ensureXlsx().then(function(){var wb=XLSX.read(buf,{type:"array"});var ws=wb.Sheets[wb.SheetNames[0]];return new Blob([XLSX.utils.sheet_to_csv(ws)],{type:"text/csv"})})}
 if((inp==="xlsx"||inp==="xls")&&out==="txt"){return ensureXlsx().then(function(){var wb=XLSX.read(buf,{type:"array"});var ws=wb.Sheets[wb.SheetNames[0]];var rows=XLSX.utils.sheet_to_json(ws,{header:1});return new Blob([rows.map(function(r){return r.join("\t")}).join("\n")],{type:"text/plain"})})}
 if(inp==="txt"&&out==="txt")return Promise.resolve(new Blob([text],{type:"text/plain"}));
 return Promise.reject(new Error("This data conversion is not supported."));
}

/* ---------- Video (ffmpeg.wasm 0.11, desktop Chrome recommended) ---------- */
var ffmpegInst=null;
function videoConvert(file,out,progress){
 return loadScript("https://unpkg.com/@ffmpeg/ffmpeg@0.11.0/dist/ffmpeg.min.js").then(function(){
  if(!window.FFmpeg||!window.FFmpeg.createFFmpeg)throw new Error("Video engine did not load in this browser.");
  if(!ffmpegInst){
   ffmpegInst=window.FFmpeg.createFFmpeg({log:false,corePath:"https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js"});
   ffmpegInst.setProgress(function(p){if(p&&p.ratio)progress(Math.round(p.ratio*100))});
   return ffmpegInst.load().then(function(){return ffmpegInst});
  }
  return ffmpegInst;
 }).then(function(ff){
  var inp=extOf(file.name);var inName="input."+inp;var outName="output."+out;
  return file.arrayBuffer().then(function(buf){ff.FS("writeFile",inName,new Uint8Array(buf));
   var args=[ "-i",inName ];
   if(out==="mp3")args.push("-vn","-c:a","libmp3lame","-q:a","2");
   else if(out==="mp4")args.push("-c:v","libx264","-c:a","aac","-movflags","+faststart");
   else if(out==="mkv")args.push("-c","copy");
   args.push(outName);
   return ff.run.apply(ff,args).then(function(){var d=ff.FS("readFile",outName);try{ff.FS("unlink",inName);ff.FS("unlink",outName)}catch(e){}return new Blob([d.buffer],{type:out==="mp3"?"audio/mpeg":"video/"+out})});
  });
 }).catch(function(e){throw new Error("Video conversion could not start: "+(e&&e.message?e.message:"engine failed to load")+". Try desktop Chrome, a smaller file, and a stable connection. Your file was not uploaded anywhere.")});
}

/* ---------- Main dispatch ---------- */
function convertFile(file,out,progress){
 var inp=extOf(file.name);var bad=canConvert(inp,out);if(bad)return Promise.reject(new Error(bad));
 var base=baseOf(file.name);out=out.toLowerCase();
 var docIn=["pdf","docx","txt","md","pptx"];
 if(docIn.indexOf(inp)>=0){
  if(out==="jpg"||out==="png"){
   if(inp!=="pdf")return Promise.reject(new Error("Only PDF can be converted directly to an image here."));
   return file.arrayBuffer().then(function(buf){return pdfToImages(buf,out)}).then(function(blobs){
    if(blobs.length===1)return {blob:blobs[0],name:base+"."+out};
    return loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js").then(function(){var zip=new JSZip();blobs.forEach(function(b,i){zip.file(base+"-page-"+(i+1)+"."+out,b)});return zip.generateAsync({type:"blob"}).then(function(z){return {blob:z,name:base+"-pages.zip"}})});
   });
  }
  var textP;
  if(inp==="pdf")textP=file.arrayBuffer().then(function(b){return pdfToText(b)});
  else if(inp==="docx")textP=file.arrayBuffer().then(function(b){return docxConvert(b,"txt")});
  else if(inp==="pptx")textP=file.arrayBuffer().then(function(b){return pptxToText(b)});
  else textP=file.text();
  if(out==="txt")return textP.then(function(t){return {blob:new Blob([t],{type:"text/plain"}),name:base+".txt"}});
  if(out==="md"){
   if(inp==="docx")return file.arrayBuffer().then(function(b){return docxConvert(b,"md")}).then(function(t){return {blob:new Blob([t],{type:"text/markdown"}),name:base+".md"}});
   if(inp==="pptx")return textP.then(function(t){return {blob:new Blob([t.split("\n\n").map(function(s){return "## "+s}).join("\n\n")],{type:"text/markdown"}),name:base+".md"}});
   return textP.then(function(t){return {blob:new Blob([mdFromText(t)],{type:"text/markdown"}),name:base+".md"}});
  }
  if(out==="docx")return textP.then(function(t){return makeDocxBlob(t).then(function(b){return {blob:b,name:base+".docx"}})});
  if(out==="pdf")return textP.then(function(t){return makePdfBlob(t).then(function(b){return {blob:b,name:base+".pdf"}})});
  if(out==="pptx")return textP.then(function(t){return makePptxBlob(t).then(function(b){return {blob:b,name:base+".pptx"}})});
 }
 var imgIn=["png","jpg","jpeg","webp","gif","bmp","avif","heic","heif","tif","tiff"];
 if(imgIn.indexOf(inp)>=0){
  if(inp==="tif"||inp==="tiff"){/* try canvas decode; imageConvert will give a clear error if it fails */ }
  return imageConvert(file,out).then(function(b){return {blob:b,name:base+"."+out}});
 }
 var vidIn=["mp4","mov","mkv","webm","avi"];
 if(vidIn.indexOf(inp)>=0){return videoConvert(file,out,progress||function(){}).then(function(b){return {blob:b,name:base+"."+out}})}
 var datIn=["txt","csv","xlsx","xls"];
 if(datIn.indexOf(inp)>=0){
  return Promise.all([file.arrayBuffer(),file.text().catch(function(){return ""})]).then(function(parts){return dataConvert(file,out,parts[0],parts[1])}).then(function(b){return {blob:b,name:base+"."+out}});
 }
 return Promise.reject(new Error("Unsupported file type: ."+inp));
}

/* ---------- Wheel UI ---------- */
function buildWheel(box){
 var cat=box.getAttribute("data-category")||"document";
 var preset=(box.getAttribute("data-preset")||"").toUpperCase();
 var cfg=CATS[cat]||CATS.document;
 var wheel=box.querySelector(".wheel");if(!wheel)return;
 wheel.innerHTML="";
 var centre=document.createElement("div");centre.className="centre";
 centre.innerHTML='<div><strong>Drop a file here</strong><br><span class="small muted">'+esc(cfg.hint)+'</span></div><input type="file" aria-label="Choose a file"><div class="fileinfo small"></div>';
 wheel.appendChild(centre);
 var input=centre.querySelector("input");
 var info=centre.querySelector(".fileinfo");
 var state={file:null};
 function setFile(f){state.file=f;box._arkFile=f;info.textContent=f?f.name+" • "+fmtSize(f.size):"";setStatus(box,"File ready: "+f.name+". Now tap an output format on the wheel.","ok")}
 function setStatus(b,msg,kind){var el=b.querySelector(".status");if(el){el.textContent=msg;el.className="status "+(kind||"")}}
 function setProgress(p){var bar=box.querySelector(".progress i");if(bar)bar.style.width=p+"%"}
 input.addEventListener("change",function(){if(input.files[0])setFile(input.files[0])});
 centre.addEventListener("dragover",function(e){e.preventDefault();centre.classList.add("drag")});
 centre.addEventListener("dragleave",function(){centre.classList.remove("drag")});
 centre.addEventListener("drop",function(e){e.preventDefault();centre.classList.remove("drag");if(e.dataTransfer.files[0])setFile(e.dataTransfer.files[0])});
 cfg.outputs.forEach(function(fmt,i){
  var btn=document.createElement("button");btn.type="button";btn.className="seg"+(preset===fmt?" active":"");btn.textContent=fmt;
  var ang=(-90+i*(360/cfg.outputs.length))*Math.PI/180;var x=50+40*Math.cos(ang);var y=50+40*Math.sin(ang);
  btn.style.left=x+"%";btn.style.top=y+"%";
  btn.title="Convert to "+fmt;
  btn.addEventListener("click",function(){doConvert(fmt)});
  btn.addEventListener("drop",function(e){e.preventDefault();if(e.dataTransfer.files[0]){setFile(e.dataTransfer.files[0]);doConvert(fmt)}});
  btn.addEventListener("dragover",function(e){e.preventDefault()});
  wheel.appendChild(btn);
 });
 function doConvert(fmt){
  if(!state.file){setStatus(box,"Choose or drop a file first, then tap "+fmt+".","err");return}
  var bad=canConvert(extOf(state.file.name),fmt);
  if(bad){setStatus(box,bad,"err");return}
  setStatus(box,"Converting to "+fmt+"… this runs in your browser, so large videos take longer.");setProgress(10);
  convertFile(state.file,fmt,function(p){setProgress(p)}).then(function(res){setProgress(100);setStatus(box,"Done — "+res.name+" is ready to download.","ok");var dl=box.querySelector(".download");if(dl){dl.style.display="inline-block";dl.textContent="Download "+res.name;dl.onclick=function(e){e.preventDefault();downloadBlob(res.blob,res.name)}}}).catch(function(err){setProgress(0);setStatus(box,err&&err.message?err.message:"Conversion failed. Try a smaller or text-based file.","err")});
 }
 box._arkConvert=doConvert;box._arkSetFile=setFile;
 if(preset){var note=box.querySelector(".preset-note");if(note)note.textContent="Preset: convert to "+preset+" — or tap any other format on the wheel."}
}
function initShiftWheel(){
 var overlay=document.createElement("div");overlay.id="shiftWheel";document.body.appendChild(overlay);
 var currentCat="document";
 document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-set-cat]");if(t)currentCat=t.getAttribute("data-set-cat")});
 document.addEventListener("dragover",function(e){
  if(e.shiftKey){overlay.style.display="block";overlay.style.left=e.clientX+"px";overlay.style.top=e.clientY+"px";var cfg=CATS[currentCat]||CATS.document;
   if(!overlay._built||overlay._cat!==currentCat){overlay.innerHTML="";cfg.outputs.forEach(function(fmt,i){var b=document.createElement("button");b.type="button";b.className="shift-seg";b.textContent=fmt;var ang=(-90+i*(360/cfg.outputs.length))*Math.PI/180;b.style.left=(50+38*Math.cos(ang))+"%";b.style.top=(50+38*Math.sin(ang))+"%";b.addEventListener("drop",function(ev){ev.preventDefault();overlay.style.display="none";var f=ev.dataTransfer.files[0];var box=document.querySelector(".wheel-box");if(f&&box&&box._arkSetFile){box._arkSetFile(f);box._arkConvert(fmt)}});b.addEventListener("dragover",function(ev){ev.preventDefault()});b.addEventListener("click",function(){var box=document.querySelector(".wheel-box");if(box&&box._arkConvert)box._arkConvert(fmt);overlay.style.display="none"});overlay.appendChild(b)});overlay._built=true;overlay._cat=currentCat}
  }else{overlay.style.display="none"}
 });
 document.addEventListener("drop",function(){overlay.style.display="none"});
 document.addEventListener("dragleave",function(){/* keep overlay until drop; hidden on drop/dragover without Shift */});
}
document.addEventListener("DOMContentLoaded",function(){
 $$(".wheel-box").forEach(buildWheel);
 $$(".tab").forEach(function(tab){tab.addEventListener("click",function(){
   $$(".tab").forEach(function(t){t.classList.remove("active")});tab.classList.add("active");
   var box=document.querySelector(".wheel-box");if(box){box.setAttribute("data-category",tab.getAttribute("data-set-cat"));box.setAttribute("data-preset","");buildWheel(box)}
 })});
 var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)e.target.classList.add("in")})},{threshold:0.12});
 $$(".reveal").forEach(function(el){io.observe(el)});
 initShiftWheel();
 /* blog list */
 var list=$("#blogList");
 if(list&&window.ARK_BLOG_POSTS){list.innerHTML=window.ARK_BLOG_POSTS.map(function(p){return '<article class="card"><h3><a href="/blog/post.html?slug='+p.slug+'">'+esc(p.title)+"</a></h3><p class='muted small'>"+esc(p.date)+"</p><p>"+esc(p.excerpt)+"</p></article>"}).join("")}
 var preview=$("#blogPreview");
 if(preview&&window.ARK_BLOG_POSTS){preview.innerHTML=window.ARK_BLOG_POSTS.map(function(p){return '<article class="card"><h3><a href="/blog/post.html?slug='+p.slug+'">'+esc(p.title)+"</a></h3><p>"+esc(p.excerpt)+'</p></article>'}).join("")}
 var postEl=$("#blogPost");
 if(postEl&&window.ARK_BLOG_POSTS){var slug=new URLSearchParams(location.search).get("slug");var post=window.ARK_BLOG_POSTS.filter(function(p){return p.slug===slug})[0]||window.ARK_BLOG_POSTS[0];document.title=post.title+" | arkConvert";postEl.innerHTML="<p class='muted small'>"+esc(post.date)+" • arkConvert Blog</p><h1>"+esc(post.title)+"</h1><p class='lead'>"+esc(post.excerpt)+"</p>"+post.body+"<p><a href='/blog/'>← All blog posts</a></p>"}
});
})();
