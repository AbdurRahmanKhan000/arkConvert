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
 document:{label:"Documents",outputs:["PDF","DOCX","TXT","MD","PPTX","HTML","JPG","PNG"],hint:"PDF, Word, text, Markdown, PowerPoint or HTML"},
 image:{label:"Images",outputs:["PNG","JPG","WEBP","GIF","BMP","AVIF","PDF"],hint:"PNG, JPG, WebP, GIF, BMP, AVIF or PDF"},
 video:{label:"Video & Audio",outputs:["MP4","MOV","MKV","WEBM","MP3","WAV","OGG","AAC"],hint:"MP4, MOV, MKV, WebM, MP3, WAV, OGG or AAC"},
 data:{label:"Data",outputs:["CSV","XLSX","TXT","JSON","XML"],hint:"Text, CSV, Excel, JSON or XML files"}
};
var CAT_INPUTS={document:["pdf","docx","txt","md","pptx","html","htm"],image:["png","jpg","jpeg","webp","gif","bmp","avif","heic","heif","tif","tiff","svg"],video:["mp4","mov","mkv","webm","avi","mp3","wav","ogg","aac"],data:["txt","csv","xlsx","xls","json","xml"]};

function canConvert(inp,out){
 inp=inp.toLowerCase();out=out.toLowerCase();
 if(inp===out)return "That is already a "+out.toUpperCase()+" file — choose a different output.";
 var catOf=function(x){
  if(["pdf","docx","txt","md","pptx","html","htm"].indexOf(x)>=0)return "Documents";
  if(["png","jpg","jpeg","webp","gif","bmp","avif","heic","heif","tif","tiff","svg"].indexOf(x)>=0)return "Images";
  if(["mp4","mov","mkv","webm","avi","mp3","wav","ogg","aac"].indexOf(x)>=0)return "Video & Audio";
  if(["csv","xlsx","xls","json","xml"].indexOf(x)>=0)return "Data";
  return null;
 };
 var cross=function(){ var oc=catOf(out); return oc ? "A "+inp.toUpperCase()+" file cannot be converted to "+out.toUpperCase()+" here — "+out.toUpperCase()+" belongs to the "+oc+" category. Use that category instead." : "That output is not supported here."; };
 var docIn=["pdf","docx","txt","md","pptx","html","htm"],docOut=["pdf","docx","txt","md","pptx","html","jpg","png"];
 if(docIn.indexOf(inp)>=0){
  if(docOut.indexOf(out)<0)return cross();
  if(inp==="docx"&&out==="pptx")return "Word to PowerPoint is not a direct conversion — convert Word to text first, then text to PPTX.";
  if(inp==="pptx"&&out==="docx")return "PowerPoint to Word is not a direct conversion — convert PPTX to text first, then text to Word.";
  if(inp==="pptx"&&out==="jpg")return "PowerPoint to image is not supported yet — convert PPTX to PDF/text first.";
  if(inp==="docx"&&out==="jpg")return "Word to image is not supported yet — convert Word to PDF first, then PDF to JPG.";
  if((inp==="html"||inp==="htm")&&(out==="jpg"||out==="png"))return "HTML to image is not supported yet — convert HTML to PDF first, then PDF to JPG/PNG.";
  if((out==="jpg"||out==="png")&&inp!=="pdf")return "Only PDF can be converted directly to an image here.";
  return null}
 var imgIn=["png","jpg","jpeg","webp","gif","bmp","avif","heic","heif","tif","tiff","svg"],imgOut=["png","jpg","webp","gif","bmp","avif","pdf"];
 if(imgIn.indexOf(inp)>=0){
  if(out==="svg")return "Tracing a raster image to SVG is not supported — SVG is an input only here. Choose PNG, JPG, WebP or PDF instead.";
  if(imgOut.indexOf(out)<0)return cross();
  return null}
 var vidIn=["mp4","mov","mkv","webm","avi","mp3","wav","ogg","aac"],vidOut=["mp4","mov","mkv","webm","mp3","wav","ogg","aac"];
 var audioIn=["mp3","wav","ogg","aac"];
 if(vidIn.indexOf(inp)>=0){
  if(vidOut.indexOf(out)<0)return cross();
  if(audioIn.indexOf(inp)>=0&&["mp4","mov","mkv","webm"].indexOf(out)>=0)return "Audio cannot be turned into a video file — choose an audio output (MP3, WAV, OGG or AAC) instead.";
  return null}
 var datIn=["txt","csv","xlsx","xls","json","xml"],datOut=["csv","xlsx","txt","json","xml"];
 if(datIn.indexOf(inp)>=0){if(datOut.indexOf(out)<0)return cross();return null}
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
function stripHtmlText(html){
 var t=String(html||"").replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"");
 t=t.replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])[^>]*>/gi,"\n").replace(/<li[^>]*>/gi,"\n• ");
 t=t.replace(/<[^>]+>/g,"");
 var ta=document.createElement("textarea");ta.innerHTML=t;return ta.value;
}
function htmlDocFromText(text,title){
 var lines=String(text).split(/\r?\n/);var body=lines.map(function(l){
  if(l.indexOf("# ")===0)return "<h1>"+esc(l.slice(2))+"</h1>";
  if(l.indexOf("## ")===0)return "<h2>"+esc(l.slice(3))+"</h2>";
  return l.trim()?"<p>"+esc(l)+"</p>":"";
 }).join("\n");
 return "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>"+esc(title||"Converted document")+"</title>\n</head>\n<body>\n"+body+"\n</body>\n</html>\n";
}


/* ---------- Structured document model (v7 fidelity) ----------
   Blocks: {type:'h',level,runs} {type:'p',runs} {type:'list',ordered,items:[{runs,level}]}
   {type:'table',rows:[[cell,...]]} {type:'code',text} {type:'hr'} {type:'break'}
   {type:'slide',title,runs}. A cell is a string or {runs}. Runs: {text,bold,italic,code}.
   Vector shapes/drawings/SmartArt/embedded fonts/scanned content cannot be
   recreated by a browser converter and are NOT invented here; the blocks
   below carry only the text/tables/lists actually read from the file. */
function runsText(runs){return (runs||[]).map(function(r){return r.text||""}).join("")}
function blockPlain(b){
  if(!b) return "";
  if(b.type==="table") return b.rows.map(function(r){return r.map(function(c){return typeof c==="string"?c:runsText(c.runs||[{text:String(c)}])}).join("\t")}).join("\n");
  if(b.type==="list") return b.items.map(function(it){return runsText(it.runs)}).join("\n");
  return runsText(b.runs)||b.text||b.title||"";
}
function blocksToText(blocks){
  var out=[];
  (blocks||[]).forEach(function(b){
    if(b.type==="h") out.push(runsText(b.runs));
    else if(b.type==="slide") out.push(runsText(b.runs));
    else if(b.type==="p") out.push(runsText(b.runs));
    else if(b.type==="code") out.push(b.text||"");
    else if(b.type==="hr") out.push("---");
    else if(b.type==="list") b.items.forEach(function(it,i){ var pre=b.ordered?((i+1)+". "):"- "; out.push(new Array((it.level||0)*2+1).join(" ")+pre+runsText(it.runs)); });
    else if(b.type==="table") b.rows.forEach(function(r){ out.push(r.map(function(c){return typeof c==="string"?c:runsText(c.runs||[{text:String(c)}])}).join("\t")); });
  });
  return out.join("\n\n");
}
function mdInlineRuns(str){
  var runs=[], re=/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g, last=0, m;
  while((m=re.exec(str))){
    if(m.index>last) runs.push({text:str.slice(last,m.index)});
    var tok=m[0];
    if(tok.slice(0,2)==="**") runs.push({text:tok.slice(2,-2),bold:true});
    else if(tok[0]==="*") runs.push({text:tok.slice(1,-1),italic:true});
    else runs.push({text:tok.slice(1,-1),code:true});
    last=m.index+tok.length;
  }
  if(last<str.length) runs.push({text:str.slice(last)});
  return runs.length?runs:[{text:str}];
}
function mdInlineMd(runs){return (runs||[]).map(function(r){ var t=r.text||""; if(r.code) return "`"+t+"`"; if(r.bold) return "**"+t+"**"; if(r.italic) return "*"+t+"*"; return t; }).join("")}
function mdInlineHtml(runs){return (runs||[]).map(function(r){ var t=esc(r.text||""); if(r.code) t="<code>"+t+"</code>"; if(r.bold) t="<strong>"+t+"</strong>"; if(r.italic) t="<em>"+t+"</em>"; return t; }).join("")}
function htmlInlineRuns(el){
  var runs=[];
  function walk(n,bold,italic){
    if(n.nodeType===3){ if(n.textContent) runs.push({text:n.textContent,bold:bold,italic:italic}); return; }
    var tag=(n.tagName||"").toLowerCase();
    var b=bold||tag==="b"||tag==="strong", it=italic||tag==="i"||tag==="em", cd=tag==="code";
    for(var i=0;i<n.childNodes.length;i++){
      if(cd && n.childNodes[i].nodeType===3){ runs.push({text:n.childNodes[i].textContent,code:true}); }
      else walk(n.childNodes[i],b,it);
    }
  }
  walk(el,false,false);
  return runs.length?runs:[{text:el.textContent||""}];
}
function htmlToBlocks(html){
  var div=document.createElement("div");
  div.innerHTML=String(html||"").replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"");
  var blocks=[];
  function walkChildren(parent){
    for(var i=0;i<parent.childNodes.length;i++){
      var n=parent.childNodes[i];
      if(n.nodeType===3){ if(n.textContent.trim()) blocks.push({type:"p",runs:[{text:n.textContent.trim()}]}); continue; }
      var tag=(n.tagName||"").toLowerCase();
      if(tag==="h1"||tag==="h2"||tag==="h3") blocks.push({type:"h",level:parseInt(tag[1],10),runs:htmlInlineRuns(n)});
      else if(tag==="p"){ if(n.textContent.trim()) blocks.push({type:"p",runs:htmlInlineRuns(n)}); }
      else if(tag==="ul"||tag==="ol"){
        var items=[];
        for(var j=0;j<n.childNodes.length;j++){ var li=n.childNodes[j]; if(li.tagName&&li.tagName.toLowerCase()==="li") items.push({runs:htmlInlineRuns(li),level:0}); }
        if(items.length) blocks.push({type:"list",ordered:tag==="ol",items:items});
      }
      else if(tag==="table"){
        var rows=[];
        for(var r=0;r<n.rows.length;r++){ var cells=[]; for(var c=0;c<n.rows[r].cells.length;c++) cells.push({runs:htmlInlineRuns(n.rows[r].cells[c])}); rows.push(cells); }
        if(rows.length) blocks.push({type:"table",rows:rows});
      }
      else if(tag==="pre") blocks.push({type:"code",text:n.textContent});
      else if(tag==="hr") blocks.push({type:"hr"});
      else if(tag==="div"||tag==="section"||tag==="article"||tag==="blockquote"||tag==="main") walkChildren(n);
    }
  }
  walkChildren(div);
  return blocks;
}
function mdToBlocks(text){
  var lines=String(text||"").split(/\r?\n/), blocks=[], i=0, para=[];
  function flushPara(){ if(para.length) blocks.push({type:"p",runs:mdInlineRuns(para.join(" "))}); para=[]; }
  function flushList(items,ordered){ if(items.length) blocks.push({type:"list",ordered:ordered,items:items}); }
  while(i<lines.length){
    var line=lines[i];
    if(line.trim().startsWith("```")){ flushPara(); var code=[]; i++; while(i<lines.length&&!lines[i].trim().startsWith("```")){ code.push(lines[i]); i++; } i++; blocks.push({type:"code",text:code.join("\n")}); continue; }
    var hm=line.match(/^(#{1,3})\s+(.*)$/);
    if(hm){ flushPara(); blocks.push({type:"h",level:hm[1].length,runs:mdInlineRuns(hm[2])}); i++; continue; }
    if(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)){ flushPara(); blocks.push({type:"hr"}); i++; continue; }
    if(line.indexOf("|")>=0 && i+1<lines.length && /^[\s|:,-]+$/.test(lines[i+1]) && lines[i+1].indexOf("-")>=0){
      flushPara(); var rows=[];
      while(i<lines.length && lines[i].indexOf("|")>=0){
        var cells=lines[i].trim().replace(/^\|/,"").replace(/\|$/,"").split("|").map(function(c){return {runs:mdInlineRuns(c.trim())}});
        rows.push(cells); i++;
        if(i<lines.length && /^[\s|:,-]+$/.test(lines[i])) i++;
      }
      if(rows.length) blocks.push({type:"table",rows:rows});
      continue;
    }
    var lm=line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if(lm){
      flushPara(); var items=[], ordered=/^\d/.test(lm[2]);
      while(i<lines.length){
        var m2=lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if(!m2) break;
        items.push({runs:mdInlineRuns(m2[3]),level:Math.floor(m2[1].length/2)});
        i++;
      }
      flushList(items,ordered); continue;
    }
    if(!line.trim()){ flushPara(); i++; continue; }
    para.push(line.trim()); i++;
  }
  flushPara();
  return blocks;
}
function txtToBlocks(text){
  return String(text||"").split(/\r?\n\r?\n/).map(function(chunk){ return chunk.trim(); }).filter(function(c){ return c; }).map(function(c){ return {type:"p",runs:[{text:c.replace(/\s*\n\s*/g," ")}]}; });
}
function pdfToBlocks(data){
  return loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js").then(function(){
    if(!window.pdfjsLib) throw new Error("PDF library did not load.");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    return window.pdfjsLib.getDocument({data:data}).promise;
  }).then(function(pdf){
    var jobs=[];
    for(var p=1;p<=pdf.numPages;p++) jobs.push(pdf.getPage(p).then(function(page){
      return page.getTextContent().then(function(tc){
        var items=tc.items.map(function(it){
          var size=Math.abs((it.transform&&it.transform[3])||it.height||11);
          return {x:(it.transform?it.transform[4]:0), y:(it.transform?it.transform[5]:0), str:it.str||"", size:size, bold:/(Bold|Black|Heavy)/i.test(it.fontName||"")};
        }).filter(function(it){ return it.str; });
        items.sort(function(a,b){ return (b.y-a.y)||(a.x-b.x); });
        var sizes=items.map(function(it){ return it.size; }).sort(function(a,b){ return a-b; });
        var median=sizes.length?sizes[Math.floor(sizes.length/2)]:11;
        var heights=items.map(function(it){ return it.size; }).sort(function(a,b){ return a-b; });
        var medH=heights.length?heights[Math.floor(heights.length/2)]:11;
        var lines=[];
        items.forEach(function(it){
          var line=null;
          for(var k=0;k<lines.length;k++){ if(Math.abs(lines[k].y-it.y)<=Math.max(3, it.size*0.6)){ line=lines[k]; break; } }
          if(!line){ line={y:it.y,items:[]}; lines.push(line); }
          line.items.push(it);
        });
        lines.sort(function(a,b){ return b.y-a.y; });
        var blocks=[], cur=null, prevY=null;
        lines.forEach(function(line){
          line.items.sort(function(a,b){ return a.x-b.x; });
          var parts=[], prevEnd=null, runs=[];
          line.items.forEach(function(it){
            if(prevEnd!==null && it.x-prevEnd>it.size*0.3) parts.push(" ");
            parts.push(it.str); runs.push({text:it.str,bold:it.bold});
            prevEnd=it.x+it.str.length*it.size*0.5;
          });
          var text=parts.join("").replace(/\s+/g," ").trim();
          if(!text) return;
          var lineSize=Math.max.apply(null, line.items.map(function(it){ return it.size; }));
          var bold=line.items.some(function(it){ return it.bold; });
          var level=lineSize>=median*1.5?1:(lineSize>=median*1.25?2:0);
          if(level){
            if(cur){ blocks.push(cur); cur=null; }
            blocks.push({type:"h",level:level,runs:[{text:text,bold:true}]});
          } else {
            if(cur && prevY!==null && (prevY-line.y)>medH*1.8){ blocks.push(cur); cur=null; }
            if(!cur) cur={type:"p",runs:[]};
            if(cur.runs.length) cur.runs.push({text:" "});
            cur.runs.push({text:text,bold:bold});
          }
          prevY=line.y;
        });
        if(cur) blocks.push(cur);
        return blocks;
      });
    }));
    return Promise.all(jobs).then(function(pages){
      var out=[];
      pages.forEach(function(blocks,idx){ if(idx>0 && blocks.length) out.push({type:"break"}); out=out.concat(blocks); });
      return out;
    });
  });
}
function docxToBlocks(data){
  return loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js").then(function(){
    if(!window.mammoth) throw new Error("Word library did not load.");
    return window.mammoth.convertToHtml({arrayBuffer:data});
  }).then(function(r){ return htmlToBlocks(r.value); });
}
function pptxToBlocks(data){
  return loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js").then(function(){ return JSZip.loadAsync(data); }).then(function(zip){
    var names=Object.keys(zip.files).filter(function(n){ return /^ppt\/slides\/slide\d+\.xml$/.test(n); }).sort(function(a,b){
      var na=parseInt(a.match(/slide(\d+)/)[1],10), nb=parseInt(b.match(/slide(\d+)/)[1],10); return na-nb;
    });
    var jobs=names.map(function(n){ return zip.file(n).async("string"); });
    return Promise.all(jobs).then(function(slides){
      var blocks=[];
      slides.forEach(function(xml,si){
        if(si>0) blocks.push({type:"break"});
        var shapes=xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g)||[];
        shapes.forEach(function(shape){
          var isTitle=/<p:ph[^>]*type="(title|ctrTitle)"/.test(shape);
          var paras=shape.match(/<a:p>[\s\S]*?<\/a:p>/g)||[];
          var shapeParas=paras.map(function(pXml){
            var lvlM=pXml.match(/<a:pPr[^>]*lvl="(\d+)"/); var lvl=lvlM?parseInt(lvlM[1],10):0;
            var runs=[];
            (pXml.match(/<a:r>[\s\S]*?<\/a:r>/g)||[]).forEach(function(rXml){
              var tM=rXml.match(/<a:t>([^<]*)<\/a:t>/); if(!tM) return;
              var bold=/<a:rPr[^>]*\sb="(1|true)"/.test(rXml);
              runs.push({text:tM[1],bold:bold});
            });
            return {runs:runs,level:lvl};
          }).filter(function(pp){ return runsText(pp.runs).trim(); });
          if(!shapeParas.length) return;
          if(isTitle){ blocks.push({type:"slide",title:runsText(shapeParas[0].runs),runs:shapeParas[0].runs}); shapeParas.slice(1).forEach(function(pp){ blocks.push({type:"p",runs:pp.runs}); }); }
          else if(shapeParas.length===1 && shapeParas[0].level===0){ blocks.push({type:"p",runs:shapeParas[0].runs}); }
          else blocks.push({type:"list",ordered:false,items:shapeParas.map(function(pp){ return {runs:pp.runs,level:pp.level}; })});
        });
      });
      return blocks;
    });
  });
}
function blocksToMd(blocks){
  var out=[];
  (blocks||[]).forEach(function(b){
    if(b.type==="h") out.push(new Array(b.level+1).join("#")+" "+mdInlineMd(b.runs));
    else if(b.type==="slide") out.push("# "+mdInlineMd(b.runs));
    else if(b.type==="p") out.push(mdInlineMd(b.runs));
    else if(b.type==="code") out.push("```\n"+(b.text||"")+"\n```");
    else if(b.type==="hr") out.push("---");
    else if(b.type==="list") b.items.forEach(function(it,i){ var pre=b.ordered?((i+1)+". "):"- "; out.push(new Array((it.level||0)*2+1).join(" ")+pre+mdInlineMd(it.runs)); });
    else if(b.type==="table"){
      var rows=b.rows.map(function(r){ return r.map(function(c){ return typeof c==="string"?c.replace(/\|/g,"\\|"):mdInlineMd(c.runs||[{text:String(c)}]).replace(/\|/g,"\\|"); }); });
      if(rows.length){ out.push("| "+rows[0].join(" | ")+" |"); out.push("| "+rows[0].map(function(){ return "---"; }).join(" | ")+" |"); rows.slice(1).forEach(function(r){ out.push("| "+r.join(" | ")+" |"); }); }
    }
  });
  return out.join("\n\n");
}
function blocksToHtml(blocks,title){
  var body=(blocks||[]).map(function(b){
    if(b.type==="h") return "<h"+b.level+">"+mdInlineHtml(b.runs)+"</h"+b.level+">";
    if(b.type==="slide") return "<h1>"+mdInlineHtml(b.runs)+"</h1>";
    if(b.type==="p") return "<p>"+mdInlineHtml(b.runs)+"</p>";
    if(b.type==="code") return "<pre>"+esc(b.text||"")+"</pre>";
    if(b.type==="hr") return "<hr>";
    if(b.type==="list"){ var tag=b.ordered?"ol":"ul"; return "<"+tag+">"+b.items.map(function(it){ return "<li>"+mdInlineHtml(it.runs)+"</li>"; }).join("")+"</"+tag+">"; }
    if(b.type==="table"){
      return "<table>"+b.rows.map(function(r,ri){ var cell=ri===0?"th":"td"; return "<tr>"+r.map(function(c){ return "<"+cell+">"+(typeof c==="string"?esc(c):mdInlineHtml(c.runs||[{text:String(c)}]))+"</"+cell+">"; }).join("")+"</tr>"; }).join("")+"</table>";
    }
    return "";
  }).join("\n");
  return "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>"+esc(title||"Converted document")+"</title>\n</head>\n<body>\n"+body+"\n</body>\n</html>\n";
}
function docxRunsXml(runs){
  return (runs||[]).map(function(r){
    var pr=(r.bold?"<w:b/>":"")+(r.italic?"<w:i/>":"");
    return "<w:r>"+(pr?"<w:rPr>"+pr+"</w:rPr>":"")+"<w:t xml:space=\"preserve\">"+esc(r.text||"")+"</w:t></w:r>";
  }).join("");
}
function docxParaXml(runs,style,numId,ilvl){
  var pr="";
  if(style) pr+="<w:pStyle w:val=\""+style+"\"/>";
  if(numId) pr+="<w:numPr><w:ilvl w:val=\""+(ilvl||0)+"\"/><w:numId w:val=\""+numId+"\"/></w:numPr>";
  return "<w:p>"+(pr?"<w:pPr>"+pr+"</w:pPr>":"")+docxRunsXml(runs)+"</w:p>";
}
function blocksToDocxXml(blocks){
  var parts=[];
  (blocks||[]).forEach(function(b){
    if(b.type==="h") parts.push(docxParaXml(b.runs,"Heading"+b.level));
    else if(b.type==="slide") parts.push(docxParaXml(b.runs,"Heading1"));
    else if(b.type==="p") parts.push(docxParaXml(b.runs));
    else if(b.type==="code") parts.push(docxParaXml([{text:b.text||""}]));
    else if(b.type==="hr") parts.push("<w:p><w:pPr><w:pBdr><w:bottom w:val=\"single\" w:sz=\"6\" w:space=\"1\" w:color=\"999999\"/></w:pBdr></w:pPr></w:p>");
    else if(b.type==="list") b.items.forEach(function(it){ parts.push(docxParaXml(it.runs,null,b.ordered?2:1,it.level||0)); });
    else if(b.type==="table"){
      var ncols=Math.max.apply(null,b.rows.map(function(r){ return r.length; }));
      var grid=""; for(var g=0;g<ncols;g++) grid+="<w:gridCol w:w=\"1500\"/>";
      var rowsXml=b.rows.map(function(r,ri){
        var cells="";
        for(var c=0;c<ncols;c++){
          var cell=r[c]; var runs=cell? (typeof cell==="string"?[{text:cell}]:cell.runs||[{text:String(cell)}]) : [{text:""}];
          if(ri===0) runs=runs.map(function(rr){ return {text:rr.text,bold:true,italic:rr.italic}; });
          cells+="<w:tc><w:tcPr><w:tcW w:w=\"0\" w:type=\"auto\"/></w:tcPr>"+docxParaXml(runs)+"</w:tc>";
        }
        return "<w:tr>"+cells+"</w:tr>";
      }).join("");
      parts.push("<w:tbl><w:tblPr><w:tblW w:w=\"0\" w:type=\"auto\"/><w:tblBorders><w:top w:val=\"single\" w:sz=\"4\" w:color=\"999999\"/><w:left w:val=\"single\" w:sz=\"4\" w:color=\"999999\"/><w:bottom w:val=\"single\" w:sz=\"4\" w:color=\"999999\"/><w:right w:val=\"single\" w:sz=\"4\" w:color=\"999999\"/><w:insideH w:val=\"single\" w:sz=\"4\" w:color=\"999999\"/><w:insideV w:val=\"single\" w:sz=\"4\" w:color=\"999999\"/></w:tblBorders></w:tblPr><w:tblGrid>"+grid+"</w:tblGrid>"+rowsXml+"</w:tbl>");
    }
  });
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+parts.join("")+"</w:body></w:document>";
}
function makeDocxFromBlocks(blocks){
  return loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js").then(function(){
    var zip=new JSZip();
    zip.file("[Content_Types].xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>');
    zip.folder("_rels").file(".rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.folder("word").file("_rels").file("document.xml.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>');
    zip.folder("word").file("numbering.xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="\\u2022"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="\\u25e6"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>');
    zip.folder("word").file("document.xml",blocksToDocxXml(blocks));
    return zip.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
  });
}
function makePdfFromBlocks(blocks){
  return loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js").then(function(){
    var JSPDF=window.jspdf&&window.jspdf.jsPDF; if(!JSPDF) throw new Error("PDF library did not load. Check your connection and try again.");
    var doc=new JSPDF(); var y=15, W=180, first=true;
    function ensure(h){ if(y+h>280){ doc.addPage(); y=15; } }
    function writeLines(lines,size,bold,font,x){
      doc.setFont(font||"helvetica",bold?"bold":"normal"); doc.setFontSize(size);
      lines.forEach(function(ln){ ensure(8); doc.text(ln,x||15,y); y+=size*0.55+1.5; });
    }
    function writeText(text,size,bold,x){
      var lines=doc.splitTextToSize(String(text||""),W-(x?x-15:0));
      writeLines(lines,size,bold,"helvetica",x);
    }
    (blocks||[]).forEach(function(b){
      if(b.type==="break"){ if(!first){ doc.addPage(); y=15; } return; }
      first=false;
      if(b.type==="h"){ y+=2; writeText(runsText(b.runs),b.level===1?20:(b.level===2?16:13),true); y+=2; }
      else if(b.type==="slide"){ if(y>20){ doc.addPage(); y=15; } writeText(runsText(b.runs),20,true); y+=2; }
      else if(b.type==="p"){ writeText(runsText(b.runs),11,false); y+=2; }
      else if(b.type==="code"){ doc.setFont("courier","normal"); doc.setFontSize(10); doc.splitTextToSize(b.text||"",W).forEach(function(ln){ ensure(7); doc.text(ln,15,y); y+=6; }); y+=2; }
      else if(b.type==="hr"){ ensure(8); doc.setDrawColor(150); doc.line(15,y,195,y); y+=6; }
      else if(b.type==="list"){
        b.items.forEach(function(it,i){
          var pre=b.ordered?((i+1)+". "):"\\u2022 ";
          var indent=15+(it.level||0)*8;
          var lines=doc.splitTextToSize(pre+runsText(it.runs),W-(indent-15));
          writeLines(lines,11,false,"helvetica",indent); y+=1;
        });
        y+=2;
      }
      else if(b.type==="table"){
        var ncols=Math.max.apply(null,b.rows.map(function(r){ return r.length; }));
        var cw=W/ncols;
        b.rows.forEach(function(r,ri){
          var cells=r.map(function(c){ return typeof c==="string"?c:runsText(c.runs||[{text:String(c)}]); });
          var wrapped=cells.map(function(c){ return doc.splitTextToSize(c,cw-4); });
          for(var cc=ncols;cc<cells.length;cc++) wrapped.push([""]);
          var maxL=Math.max.apply(null,wrapped.map(function(w){ return w.length; }));
          ensure(maxL*6+4);
          doc.setFont("helvetica",ri===0?"bold":"normal"); doc.setFontSize(10);
          wrapped.forEach(function(w,ci){ w.forEach(function(ln,li){ doc.text(ln,15+ci*cw+2,y+li*6); }); });
          y+=maxL*6+3;
          if(ri===0){ doc.setDrawColor(100); doc.line(15,y-1,195,y-1); }
        });
        y+=3;
      }
    });
    return doc.output("blob");
  });
}
function pptxSlidesFromBlocks(blocks){
  var slides=[{title:null,body:[]}];
  function cur(){ return slides[slides.length-1]; }
  (blocks||[]).forEach(function(b){
    if(b.type==="slide"){ slides.push({title:runsText(b.runs),body:[]}); }
    else if(b.type==="break"){ slides.push({title:null,body:[]}); }
    else if(b.type==="h"&&b.level===1){ if(cur().title||cur().body.length) slides.push({title:runsText(b.runs),body:[]}); else cur().title=runsText(b.runs); }
    else if(b.type==="h"){ cur().body.push({text:runsText(b.runs),bold:true,bullet:false}); }
    else if(b.type==="p"){ cur().body.push({text:runsText(b.runs),bold:false,bullet:false}); }
    else if(b.type==="code"){ cur().body.push({text:b.text||"",bold:false,bullet:false,mono:true}); }
    else if(b.type==="list"){ b.items.forEach(function(it){ cur().body.push({text:runsText(it.runs),bold:false,bullet:true,level:it.level||0}); }); }
    else if(b.type==="table"){ b.rows.forEach(function(r){ cur().body.push({text:r.map(function(c){ return typeof c==="string"?c:runsText(c.runs||[{text:String(c)}]); }).join("  |  "),bold:false,bullet:false}); }); }
  });
  return slides.filter(function(s){ return s.title||s.body.length; });
}
function makePptxFromBlocks(blocks){
  return loadScript("https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js").then(function(){
    if(!window.PptxGenJS) throw new Error("PowerPoint library did not load. Check your connection and try again.");
    var pptx=new window.PptxGenJS();
    pptxSlidesFromBlocks(blocks).slice(0,60).forEach(function(slide,i){
      var s=pptx.addSlide();
      s.addText(slide.title||("Slide "+(i+1)),{x:0.5,y:0.4,w:9,h:0.8,fontSize:24,bold:true,color:"0B223D"});
      if(slide.body.length){
        var arr=slide.body.map(function(it){
          return {text:it.text,options:{fontSize:16,color:"333333",bold:!!it.bold,bullet:!!it.bullet,indent:it.level?it.level*12:0,fontFace:it.mono?"Consolas":undefined}};
        });
        s.addText(arr,{x:0.5,y:1.4,w:9,h:4.5,valign:"top"});
      }
    });
    return pptx.write({outputType:"blob"});
  });
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
  /* v7: createImageBitmap with imageOrientation 'from-image' so EXIF-rotated
     photos come out upright; falls back to <img> where bitmaps are unsupported
     (e.g. some SVG). The result has width/height and draws with drawImage at
     its original size -- never stretched. */
  function imgFallback(){
    return new Promise(function(res,rej){var url=URL.createObjectURL(blob);var img=new Image();img.onload=function(){URL.revokeObjectURL(url);res(img)};img.onerror=function(){URL.revokeObjectURL(url);rej(new Error("This image could not be decoded in your browser."))};img.src=url});
  }
  if(window.createImageBitmap) return window.createImageBitmap(blob,{imageOrientation:"from-image"}).catch(imgFallback);
  return imgFallback();
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
 if(inp==="svg"){
  work=work.then(function(blob){return blob.text().then(function(txt){
   var w=txt.match(/width=["']([0-9.]+)/i), h=txt.match(/height=["']([0-9.]+)/i), vb=txt.match(/viewBox=["']([0-9.\s,-]+)["']/i);
   if(!w||!h){
    var vw=1024, vh=1024; if(vb){ var parts=vb[1].trim().split(/[\s,]+/); if(parts.length>=4){ vw=parseFloat(parts[2])||1024; vh=parseFloat(parts[3])||1024; } }
    txt=txt.replace(/<svg([^>]*)>/i, function(m,attrs){ return "<svg"+attrs+(w?"":" width=\""+vw+"\"")+(h?"":" height=\""+vh+"\"")+">"; });
   }
   return new Blob([txt],{type:"image/svg+xml"});
  })});
 }
 return work.then(function(blob){
  if(out==="pdf"){return loadImageBlob(blob).then(function(img){return loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js").then(function(){var JSPDF=window.jspdf.jsPDF;var landscape=img.width>=img.height;var doc=new JSPDF({orientation:landscape?"landscape":"portrait",unit:"mm",format:"a4"});var pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();var margin=10;var wMm=img.width*25.4/96,hMm=img.height*25.4/96;var scale=Math.min((pageW-2*margin)/wMm,(pageH-2*margin)/hMm);var dw=wMm*scale,dh=hMm*scale;var x=(pageW-dw)/2,y=(pageH-dh)/2;var c=document.createElement("canvas");c.width=img.width;c.height=img.height;c.getContext("2d").drawImage(img,0,0);return new Promise(function(res,rej){c.toBlob(function(b){if(!b){rej(new Error("Could not render this image as a PDF."));return}var r=new FileReader();r.onload=function(){doc.addImage(r.result,"PNG",x,y,dw,dh);res(doc.output("blob"))};r.readAsDataURL(b)},"image/png")})})})}
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
function csvEscape(v){v=String(v==null?"":v);return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function padRows(rows){ var n=Math.max.apply(null,rows.map(function(r){return r.length})); return rows.map(function(r){ var out=r.slice(); while(out.length<n) out.push(""); return out; }); }
function rowsToCsv(rows){ return padRows(rows).map(function(r){ return r.map(csvEscape).join(","); }).join("\n"); }
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
 if((inp==="xlsx"||inp==="xls")&&out==="csv"){return ensureXlsx().then(function(){var wb=XLSX.read(buf,{type:"array",cellDates:true});var ws=wb.Sheets[wb.SheetNames[0]];var rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:true});return new Blob([rowsToCsv(rows)],{type:"text/csv"})})}
 if((inp==="xlsx"||inp==="xls")&&out==="txt"){return ensureXlsx().then(function(){var wb=XLSX.read(buf,{type:"array",cellDates:true});var ws=wb.Sheets[wb.SheetNames[0]];var rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:true});return new Blob([padRows(rows).map(function(r){return r.join("\t")}).join("\n")],{type:"text/plain"})})}
 if(inp==="txt"&&out==="json"){ var jl=String(text).split(/\r?\n/).filter(function(l){return l.trim()}); return Promise.resolve(new Blob([JSON.stringify(jl,null,2)],{type:"application/json"})); }
 if(inp==="txt"&&out==="xml"){ var xl=String(text).split(/\r?\n/).filter(function(l){return l.trim()}); return Promise.resolve(new Blob([rowsToXml(xl.map(function(l){return {value:l}}),["value"])],{type:"application/xml"})); }
 if(inp==="csv"&&out==="json"){ var crow=csvParse(text); if(!crow.length)throw new Error("This CSV file is empty."); var hdr=crow[0]; var objs=crow.slice(1).filter(function(r){return r.join("").trim()}).map(function(r){ var o={}; hdr.forEach(function(h,i){ o[h||("col"+(i+1))]=r[i]==null?"":r[i]; }); return o; }); return Promise.resolve(new Blob([JSON.stringify(objs,null,2)],{type:"application/json"})); }
 if(inp==="csv"&&out==="xml"){ var crow2=csvParse(text); if(!crow2.length)throw new Error("This CSV file is empty."); return Promise.resolve(new Blob([rowsToXml(crow2.slice(1),crow2[0])],{type:"application/xml"})); }
 if((inp==="xlsx"||inp==="xls")&&out==="json"){ return ensureXlsx().then(function(){ var wb=XLSX.read(buf,{type:"array",cellDates:true}); var ws=wb.Sheets[wb.SheetNames[0]]; var objs=XLSX.utils.sheet_to_json(ws,{defval:"",raw:true}); return new Blob([JSON.stringify(objs,null,2)],{type:"application/json"}); }); }
 if((inp==="xlsx"||inp==="xls")&&out==="xml"){ return ensureXlsx().then(function(){ var wb=XLSX.read(buf,{type:"array",cellDates:true}); var ws=wb.Sheets[wb.SheetNames[0]]; var aoa=XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:true}); if(!aoa.length)throw new Error("This spreadsheet is empty."); return new Blob([rowsToXml(padRows(aoa).slice(1),padRows(aoa)[0])],{type:"application/xml"}); }); }
 if(inp==="json"&&out==="csv"){ var jdata=JSON.parse(text); var jrows=jsonToRows(jdata); if(!jrows.length)throw new Error("This JSON file has no rows."); var jhdr=[]; jrows.forEach(function(r){ Object.keys(r).forEach(function(k){ if(jhdr.indexOf(k)<0)jhdr.push(k); }); }); var jcsv=[jhdr.map(csvEscape).join(",")].concat(jrows.map(function(r){ return jhdr.map(function(h){ return csvEscape(r[h]); }).join(","); })).join("\n"); return Promise.resolve(new Blob([jcsv],{type:"text/csv"})); }
 if(inp==="json"&&out==="txt"){ var jdata2=JSON.parse(text); var jrows2=jsonToRows(jdata2); var jhdr2=[]; jrows2.forEach(function(r){ Object.keys(r).forEach(function(k){ if(jhdr2.indexOf(k)<0)jhdr2.push(k); }); }); var jtxt=jrows2.length&&jhdr2.length?([jhdr2.join("\t")].concat(jrows2.map(function(r){ return jhdr2.map(function(h){ return r[h]==null?"":r[h]; }).join("\t"); })).join("\n")):JSON.stringify(jdata2,null,2); return Promise.resolve(new Blob([jtxt],{type:"text/plain"})); }
 if(inp==="json"&&out==="xlsx"){ return ensureXlsx().then(function(){ var jdata3=JSON.parse(text); var jrows3=jsonToRows(jdata3); var hdr3=[]; jrows3.forEach(function(r){ if(!Array.isArray(r)) Object.keys(r).forEach(function(k){ if(hdr3.indexOf(k)<0) hdr3.push(k); }); }); var aoa3=jrows3.map(function(r){ return Array.isArray(r)?r:hdr3.map(function(h){ return r[h]==null?"":r[h]; }); }); if(jrows3.length&&!Array.isArray(jrows3[0])) aoa3=[hdr3].concat(aoa3); var ws=XLSX.utils.aoa_to_sheet(aoa3); var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Sheet1"); return new Blob([XLSX.write(wb,{bookType:"xlsx",type:"array"})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}); }); }
if(inp==="json"&&out==="xml"){ var jdata4=JSON.parse(text); var jrows4=jsonToRows(jdata4); return Promise.resolve(new Blob([rowsToXml(jrows4)],{type:"application/xml"})); }
 if(inp==="xml"&&out==="csv"){ var xr=xmlToRows(text); var xcsv=[xr.headers.map(csvEscape).join(",")].concat(xr.rows.map(function(r){ return xr.headers.map(function(h){ return csvEscape(r[h]); }).join(","); })).join("\n"); return Promise.resolve(new Blob([xcsv],{type:"text/csv"})); }
 if(inp==="xml"&&out==="txt"){ var xr2=xmlToRows(text); var xtxt=[xr2.headers.join("\t")].concat(xr2.rows.map(function(r){ return xr2.headers.map(function(h){ return r[h]==null?"":r[h]; }).join("\t"); })).join("\n"); return Promise.resolve(new Blob([xtxt],{type:"text/plain"})); }
 if(inp==="xml"&&out==="json"){ var xr3=xmlToRows(text); return Promise.resolve(new Blob([JSON.stringify(xr3.rows,null,2)],{type:"application/json"})); }
 if(inp==="xml"&&out==="xlsx"){ return ensureXlsx().then(function(){ var xr4=xmlToRows(text); var aoa4=[xr4.headers].concat(xr4.rows.map(function(r){ return xr4.headers.map(function(h){ return r[h]==null?"":r[h]; }); })); var ws=XLSX.utils.aoa_to_sheet(aoa4); var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Sheet1"); return new Blob([XLSX.write(wb,{bookType:"xlsx",type:"array"})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}); }); }
 if(inp==="txt"&&out==="txt")return Promise.resolve(new Blob([text],{type:"text/plain"}));
 return Promise.reject(new Error("This data conversion is not supported."));
}

/* ---------- Data helpers: JSON / XML ---------- */
function xmlEscape(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function xmlTag(n){var t=String(n||"col").replace(/[^A-Za-z0-9_]/g,"_");if(/^[0-9]/.test(t))t="c_"+t;return t||"col"}
function rowsToXml(rows,headers){
 var out=["<?xml version=\"1.0\" encoding=\"UTF-8\"?>","<rows>"];
 rows.forEach(function(r){
  out.push(" <row>");
  if(Array.isArray(r)){ r.forEach(function(v,i){ var tag=headers&&headers[i]?xmlTag(headers[i]):"col"+(i+1); out.push("  <"+tag+">"+xmlEscape(v)+"</"+tag+">"); }); }
  else { Object.keys(r).forEach(function(k){ out.push("  <"+xmlTag(k)+">"+xmlEscape(r[k])+"</"+xmlTag(k)+">"); }); }
  out.push(" </row>");
 });
 out.push("</rows>"); return out.join("\n");
}
function xmlToRows(text){
 var doc=new DOMParser().parseFromString(String(text),"text/xml");
 if(doc.getElementsByTagName("parsererror").length) throw new Error("This XML file could not be parsed — check that its tags are properly closed.");
 var rowEls=[]; ["row","record","item","entry"].forEach(function(tag){ var els=doc.getElementsByTagName(tag); for(var i=0;i<els.length;i++) rowEls.push(els[i]); });
 if(!rowEls.length){
  var kids=doc.documentElement?doc.documentElement.children:null;
  if(kids&&kids.length){ for(var j=0;j<kids.length;j++) rowEls.push(kids[j]); }
 }
 if(!rowEls.length) throw new Error("No rows were found in this XML file.");
 var headers=[], rows=[];
 rowEls.forEach(function(el){
  var obj={}, kids2=el.children;
  if(kids2&&kids2.length){ for(var k=0;k<kids2.length;k++){ var tag=kids2[k].tagName; if(headers.indexOf(tag)<0)headers.push(tag); obj[tag]=kids2[k].textContent; } }
  else { obj={value:el.textContent}; if(headers.indexOf("value")<0)headers.push("value"); }
  rows.push(obj);
 });
 return {headers:headers, rows:rows};
}
function jsonToRows(data){
 if(Array.isArray(data)) return data;
 if(data&&typeof data==="object"){ if(Array.isArray(data.rows)) return data.rows; return [data]; }
 return [{value:data}];
}
/* ---------- Video (ffmpeg.wasm 0.12, SINGLE-THREAD core: no SharedArrayBuffer, no COOP/COEP) ---------- */
var ffmpegInst=null, ffmpegLoad=null;
function loadFFmpegST(progress){
 if(ffmpegInst) return Promise.resolve(ffmpegInst);
 if(ffmpegLoad) return ffmpegLoad;
 ffmpegLoad=(async function(){
   /* Vendored locally: import.meta.url is same-origin, so the ffmpeg
      Worker (new URL("./worker.js", import.meta.url)) can be constructed.
      Only core/wasm are still fetched as blobs from the CDN. */
   var mod=await import("/assets/ffmpeg/index.js");
   var util=await import("/assets/ffmpeg-util/index.js");
   var ff=new mod.FFmpeg();
   ff.on("progress",function(e){ if(e&&e.progress!=null&&progress) progress(Math.round(e.progress*100)); });
   var base="https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
   await ff.load({coreURL: await util.toBlobURL(base+"/ffmpeg-core.js","text/javascript"), wasmURL: await util.toBlobURL(base+"/ffmpeg-core.wasm","application/wasm")});
   ffmpegInst=ff; return ff;
 })();
 ffmpegLoad.catch(function(){ ffmpegLoad=null; });
 return ffmpegLoad;
}
function videoConvert(file,out,progress){
 return loadFFmpegST(progress).then(async function(ff){
   var inp=extOf(file.name); var inName="input."+inp; var outName="output."+out;
   await ff.writeFile(inName, new Uint8Array(await file.arrayBuffer()));
   var args=["-i",inName];
   if(out==="mp3") args.push("-vn","-c:a","libmp3lame","-q:a","2");
   else if(out==="wav") args.push("-vn","-c:a","pcm_s16le");
   else if(out==="ogg") args.push("-vn","-c:a","libvorbis");
   else if(out==="aac") args.push("-vn","-c:a","aac");
   else if(out==="mp4") args.push("-c:v","libx264","-c:a","aac","-movflags","+faststart");
   else if(out==="mov") args.push("-c:v","libx264","-c:a","aac","-movflags","+faststart");
   else if(out==="webm") args.push("-c:v","libvpx-vp9","-crf","30","-b:v","0","-c:a","libopus");
   else if(out==="mkv") args.push("-c","copy");
   args.push(outName);
   var code=await ff.exec(args);
   if(code!==0) throw new Error("Video encoder returned an error. Try a smaller file in desktop Chrome.");
   var d=await ff.readFile(outName);
   try{ await ff.deleteFile(inName); await ff.deleteFile(outName); }catch(e){}
   if(!d||d.length===0) throw new Error("Video conversion produced an empty file.");
   var mimeMap={mp3:"audio/mpeg",wav:"audio/wav",ogg:"audio/ogg",aac:"audio/aac",mp4:"video/mp4",mov:"video/quicktime",mkv:"video/x-matroska",webm:"video/webm"};
   return new Blob([d],{type:mimeMap[out]||("video/"+out)});
 }).catch(function(e){
   var msg=e&&e.message?e.message:"video engine failed to load";
   if(/SharedArrayBuffer/i.test(msg)) msg="Video engine could not start on this page. Reload, then try desktop Chrome with a smaller file.";
   throw new Error("Video conversion could not start: "+msg+". Try desktop Chrome, a smaller file, and a stable connection. Your file was not uploaded anywhere.");
 });
}

/* ---------- Main dispatch ---------- */
function convertFile(file,out,progress){
 var inp=extOf(file.name);var bad=canConvert(inp,out);if(bad)return Promise.reject(new Error(bad));
 var base=baseOf(file.name);out=out.toLowerCase();
 var docIn=["pdf","docx","txt","md","pptx","html","htm"];
 if(docIn.indexOf(inp)>=0){
  if(out==="jpg"||out==="png"){
   if(inp!=="pdf")return Promise.reject(new Error("Only PDF can be converted directly to an image here."));
   return file.arrayBuffer().then(function(buf){return pdfToImages(buf,out)}).then(function(blobs){
    if(blobs.length===1)return {blob:blobs[0],name:base+"."+out};
    return loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js").then(function(){var zip=new JSZip();blobs.forEach(function(b,i){zip.file(base+"-page-"+(i+1)+"."+out,b)});return zip.generateAsync({type:"blob"}).then(function(z){return {blob:z,name:base+"-pages.zip"}})});
   });
  }
   /* v7: structured path first (headings/lists/tables/order preserved);
      if a structured parser fails, fall back to the old flat-text path so a
      parser bug never turns a previously working conversion into an error. */
   var docP;
   if(inp==="pdf")docP=file.arrayBuffer().then(function(b){return pdfToBlocks(b)});
   else if(inp==="docx")docP=file.arrayBuffer().then(function(b){return docxToBlocks(b)});
   else if(inp==="pptx")docP=file.arrayBuffer().then(function(b){return pptxToBlocks(b)});
   else if(inp==="html"||inp==="htm")docP=file.text().then(function(t){return htmlToBlocks(t)});
   else if(inp==="md")docP=file.text().then(function(t){return mdToBlocks(t)});
   else docP=file.text().then(function(t){return txtToBlocks(t)});
   var flatP;
   if(inp==="pdf")flatP=file.arrayBuffer().then(function(b){return pdfToText(b)});
   else if(inp==="docx")flatP=file.arrayBuffer().then(function(b){return docxConvert(b,"txt")});
   else if(inp==="pptx")flatP=file.arrayBuffer().then(function(b){return pptxToText(b)});
   else if(inp==="html"||inp==="htm")flatP=file.text().then(function(t){return stripHtmlText(t)});
   else flatP=file.text();
   docP=docP.catch(function(){ return flatP.then(function(t){return txtToBlocks(t)}); });
   docP=docP.then(function(blocks){ if(!blocksToText(blocks).trim()){ if(inp==="pdf") throw new Error("No extractable text found \u2014 this looks like a scanned PDF. Try a text-based PDF, or convert the PDF to an image instead."); throw new Error("No text could be extracted from this file. It may be empty or in an unsupported format."); } return blocks; });
   if(out==="html")return docP.then(function(blocks){return {blob:new Blob([blocksToHtml(blocks,base)],{type:"text/html"}),name:base+".html"}});
   if(out==="txt")return docP.then(function(blocks){return {blob:new Blob([blocksToText(blocks)],{type:"text/plain"}),name:base+".txt"}});
   if(out==="md")return docP.then(function(blocks){return {blob:new Blob([blocksToMd(blocks)],{type:"text/markdown"}),name:base+".md"}});
   if(out==="docx")return docP.then(function(blocks){return makeDocxFromBlocks(blocks).then(function(b){return {blob:b,name:base+".docx"}})});
   if(out==="pdf")return docP.then(function(blocks){return makePdfFromBlocks(blocks).then(function(b){return {blob:b,name:base+".pdf"}})});
   if(out==="pptx")return docP.then(function(blocks){return makePptxFromBlocks(blocks).then(function(b){return {blob:b,name:base+".pptx"}})});
 }
 var imgIn=["png","jpg","jpeg","webp","gif","bmp","avif","heic","heif","tif","tiff","svg"];
 if(imgIn.indexOf(inp)>=0){
  if(inp==="tif"||inp==="tiff"){/* try canvas decode; imageConvert will give a clear error if it fails */ }
  return imageConvert(file,out).then(function(b){return {blob:b,name:base+"."+out}}).catch(function(e){ if(/decode|HEIC/i.test(e.message||"")) throw e; throw new Error("This image could not be converted: "+(e.message||"unknown error")+" Try a PNG or JPG file and tap Retry."); });
 }
 var vidIn=["mp4","mov","mkv","webm","avi","mp3","wav","ogg","aac"];
 if(vidIn.indexOf(inp)>=0){return videoConvert(file,out,progress||function(){}).then(function(b){return {blob:b,name:base+"."+out}})}
 var datIn=["txt","csv","xlsx","xls","json","xml"];
 if(datIn.indexOf(inp)>=0){
  return Promise.all([file.arrayBuffer(),file.text().catch(function(){return ""})]).then(function(parts){return dataConvert(file,out,parts[0],parts[1])}).then(function(b){return {blob:b,name:base+"."+out}}).catch(function(e){ if(/not supported/i.test(e.message||"")) throw e; throw new Error("This spreadsheet or data file could not be read — it may be damaged or in an unsupported format. Check the file and tap Retry."); });
 }
 return Promise.reject(new Error("Unsupported file type: ."+inp));
}

/* ---------- Wheel UI: two-stage flow ---------- */

/* ---------- Wedge wheel (SVG pie/donut, slow rotation, upright labels) ---------- */
var __arkDragging=false, __arkConverting=false;
document.addEventListener("dragstart",function(){ __arkDragging=true; });
document.addEventListener("dragend",function(){ __arkDragging=false; });
function wedgePath(cx,cy,rO,rI,a0,a1){
 var gap=0.035; a0+=gap; a1-=gap;
 var pt=function(r,a){ return (cx+r*Math.cos(a)).toFixed(2)+","+(cy+r*Math.sin(a)).toFixed(2); };
 var large=(a1-a0)>Math.PI?1:0;
 return "M"+pt(rO,a0)+" A"+rO+","+rO+" 0 "+large+" 1 "+pt(rO,a1)+" L"+pt(rI,a1)+" A"+rI+","+rI+" 0 "+large+" 0 "+pt(rI,a0)+" Z";
}
function buildWedgeSVG(container, segments, opts){
 var NS="http://www.w3.org/2000/svg";
 var svg=document.createElementNS(NS,"svg"); svg.setAttribute("viewBox","0 0 400 400"); svg.setAttribute("class","wheel-svg"); svg.setAttribute("role","group");
 var rotor=document.createElementNS(NS,"g"), labels=document.createElementNS(NS,"g");
 svg.appendChild(rotor); svg.appendChild(labels); container.appendChild(svg);
 var cx=200, cy=200, rM=143, n=segments.length, texts=[];
 var state={angle:0,last:null,hover:false,reduced:!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)};
 segments.forEach(function(seg,i){
  var a0=(-Math.PI/2)+i*(2*Math.PI/n), a1=a0+(2*Math.PI/n);
  var path=document.createElementNS(NS,"path");
  path.setAttribute("d", wedgePath(cx,cy,188,98,a0,a1));
  path.setAttribute("class","wedge"+(seg.active?" active":""));
  path.setAttribute("tabindex","0");
  var ttl=document.createElementNS(NS,"title"); ttl.textContent=seg.label; path.appendChild(ttl);
  var activate=function(){ if(opts.onSelect) opts.onSelect(seg.value||seg.label, path); };
  path.addEventListener("click",activate);
  path.addEventListener("keydown",function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); activate(); }});
  path.addEventListener("mouseenter",function(){ state.hover=true; path.classList.add("hover"); });
  path.addEventListener("mouseleave",function(){ state.hover=false; path.classList.remove("hover"); });
  path.addEventListener("dragover",function(e){ e.preventDefault(); state.hover=true; path.classList.add("hover"); });
  path.addEventListener("dragleave",function(){ state.hover=false; path.classList.remove("hover"); });
  path.addEventListener("drop",function(e){ e.preventDefault(); state.hover=false; path.classList.remove("hover"); if(opts.onDrop) opts.onDrop(seg.value||seg.label, e); });
  rotor.appendChild(path);
  var txt=document.createElementNS(NS,"text"); txt.setAttribute("class","wedge-label"); txt.setAttribute("dominant-baseline","middle");
  var words=seg.label.split(" ");
  if(words.length>1 && seg.label.length>9){
   var half=Math.ceil(words.length/2);
   var s1=document.createElementNS(NS,"tspan"); s1.setAttribute("dy","-7"); s1.textContent=words.slice(0,half).join(" ");
   var s2=document.createElementNS(NS,"tspan"); s2.setAttribute("dy","14"); s2.textContent=words.slice(half).join(" ");
   txt.appendChild(s1); txt.appendChild(s2);
  } else { txt.textContent=seg.label; }
  labels.appendChild(txt); texts.push({el:txt,mid:(a0+a1)/2});
 });
 function frame(ts){
  if(state.last==null) state.last=ts;
  var dt=(ts-state.last)/1000; state.last=ts;
  var paused=__arkDragging||__arkConverting||state.reduced; /* v7.1: hover no longer pauses — a cursor resting on the wheel made it look dead. state.hover still highlights the wedge. */
  if(!paused) state.angle+=dt*(360/60); /* v7: ~60 seconds per revolution: slow and professional, but clearly visibly spinning. Pauses ONLY on hover, during a real drag, and while converting. */
  rotor.setAttribute("transform","rotate("+state.angle.toFixed(2)+" 200 200)");
  texts.forEach(function(item){
   var a=item.mid+state.angle*Math.PI/180;
   var x=cx+rM*Math.cos(a), y=cy+rM*Math.sin(a);
   item.el.setAttribute("x",x.toFixed(1)); item.el.setAttribute("y",y.toFixed(1));
   Array.prototype.forEach.call(item.el.querySelectorAll("tspan"),function(sp){ sp.setAttribute("x",x.toFixed(1)); });
  });
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
 /* v7: no permanent stop. The frame keeps running and re-renders labels upright at the current angle every frame; drag accuracy comes from the drag pause, not from freezing the wheel. */
 return {svg:svg};
}

/* Stage 1: drop zone only. Stage 2 (after a file arrives): conversion wheel
   + draggable file chip. Drag the chip onto a segment, tap a segment, or
   drop a native file directly onto a segment. */
function buildWheel(box){
 var cat=box.getAttribute("data-category")||"document";
 var preset=(box.getAttribute("data-preset")||"").toUpperCase();
 var cfg=CATS[cat]||CATS.document;
 var wheel=box.querySelector(".wheel");if(!wheel)return;
 wheel.innerHTML="";
 var state={file:null,lastFmt:null};
 function setStatus(msg,kind){var el=box.querySelector(".status");if(el){el.textContent=msg;el.className="status "+(kind||"")}}
 function setProgress(p){var bar=box.querySelector(".progress i");if(bar)bar.style.width=p+"%"}
 function hideDownload(){var dls=box.querySelectorAll(".download");dls.forEach(function(dl){dl.hidden=true;dl.style.display="none";dl.removeAttribute("href")})}
 function showActions(show){var a=box.querySelector(".err-actions");if(a)a.hidden=!show}
 function showError(msg){ setProgress(0); setStatus(msg,"err"); hideDownload(); showActions(true); __arkConverting=false; }
 var centre=document.createElement("div");centre.className="centre";
 centre.innerHTML="<strong>"+esc(cfg.label)+"</strong><span class=\"small\">Release the file on a format</span>";
 centre.setAttribute("draggable","false");
 centre.addEventListener("dragstart",function(e){ if(!state.file)return; try{ e.dataTransfer.setData("text/plain","arkfile"); e.dataTransfer.effectAllowed="copyMove"; __arkDragging=true; }catch(err){} });
 centre.addEventListener("dragend",function(){ __arkDragging=false; });
 centre.addEventListener("dragover",function(e){ e.preventDefault(); });
 centre.addEventListener("drop",function(e){ e.preventDefault(); if(e.dataTransfer.files&&e.dataTransfer.files[0]){ setFile(e.dataTransfer.files[0]); } else if(state.file){ setStatus("Release the file on a format segment, not the centre.","err"); } });
 function setFile(f){
  state.file=f;box._arkFile=f;
  /* v7: the wheel keeps spinning after a file arrives. Drag accuracy is handled by the drag pause (__arkDragging is true while a chip/native file is being dragged), so a permanent stop is not needed and must not make the wheel look dead. */
  var chip=document.querySelector(".file-chip");if(chip)chip.textContent=f.name+" • "+fmtSize(f.size);
  var stage=document.querySelector(".stage2");if(stage)stage.hidden=false;
  var dz=document.querySelector(".dropzone");if(dz)dz.hidden=true;
  var sp=centre.querySelector(".small");if(sp)sp.textContent=f.name+" • "+fmtSize(f.size);
  centre.setAttribute("draggable","true");
  hideDownload(); showActions(false); setProgress(0);
  setStatus("File ready — drag it onto a format, or tap a format.","ok");
 }
 function doConvert(fmt){
  if(!state.file){setStatus("Drop or browse for a file first, then drag it onto "+fmt+".","err");return}
  var inp=extOf(state.file.name);
  var allowed=CAT_INPUTS[cat]||[];
  if(state.file.size===0){showError("That file is empty (0 bytes) — choose a different file. This page accepts: "+allowed.map(function(x){return "."+x.toUpperCase()}).join(", ")+".");return}
  if(allowed.length&&allowed.indexOf(inp)<0){showError("Wrong file type for "+cfg.label+". This page accepts: "+allowed.map(function(x){return "."+x.toUpperCase()}).join(", ")+".");return}
  var bad=canConvert(inp,fmt);
  if(bad){showError(bad);return}
  state.lastFmt=fmt; __arkConverting=true; hideDownload(); showActions(false);
  setStatus("Converting to "+fmt+"…");setProgress(10);
  convertFile(state.file,fmt,function(p){setProgress(p)}).then(function(res){
   __arkConverting=false;
   if(!res.blob||res.blob.size===0){ showError("Conversion produced an empty file — try a different file or format."); return; }
   setProgress(100);setStatus("Done — "+res.name+" is ready.","ok"); showActions(false);
   var dl=box.querySelector(".download");
   if(dl){dl.hidden=false;dl.style.display="";dl.textContent="Download "+res.name;dl.onclick=function(e){e.preventDefault();downloadBlob(res.blob,res.name)}}
  }).catch(function(err){
   __arkConverting=false;
   var msg=err&&err.message?err.message:"Conversion failed.";
   if(/Could not load|did not load/i.test(msg)) msg="Converter library failed to load. Check your connection, then tap Retry.";
   else if(/SharedArrayBuffer/i.test(msg)) msg="Video engine could not start on this page. Try desktop Chrome with a smaller file, then tap Retry.";
   showError(msg);
  });
 }
 var segs=cfg.outputs.map(function(fmt){ return {label:fmt,value:fmt,active:(preset===fmt)}; });
 buildWedgeSVG(wheel, segs, {
  onSelect:function(fmt){ doConvert(fmt); },
  onDrop:function(fmt,e){ if(e.dataTransfer.files&&e.dataTransfer.files[0]){ setFile(e.dataTransfer.files[0]); doConvert(fmt); } else if(state.file){ doConvert(fmt); } }
 });
 wheel.appendChild(centre);
 var actions=document.createElement("div"); actions.className="err-actions"; actions.hidden=true;
 var retry=document.createElement("button"); retry.type="button"; retry.className="btn"; retry.textContent="Retry";
 retry.addEventListener("click",function(){ if(state.lastFmt) doConvert(state.lastFmt); });
 var change2=document.createElement("button"); change2.type="button"; change2.className="btn ghost"; change2.textContent="Change file";
 change2.addEventListener("click",function(){ var cb=document.querySelector(".change-file"); if(cb) cb.click(); });
 actions.appendChild(retry); actions.appendChild(change2); box.appendChild(actions);
 box._arkConvert=doConvert;box._arkSetFile=setFile;box._arkShowError=showError;
}
document.addEventListener("DOMContentLoaded",function(){
 var box=document.querySelector(".wheel-box");
 if(box){
  var params=new URLSearchParams(location.search);
  var cat=params.get("cat");
  if(!cat&&location.hash){var h=location.hash.replace("#","");if(CATS[h])cat=h}
  if(cat&&CATS[cat])box.setAttribute("data-category",cat);
  if(location.pathname.indexOf("tools.html")>=0){
   var t=document.getElementById("pageTitle");var cfg=CATS[box.getAttribute("data-category")]||CATS.document;
   if(t) t.textContent=cfg.label;
  }
  buildWheel(box);
  var dz=document.querySelector(".dropzone");
  var input=document.querySelector(".drop-input");
  var chip=document.querySelector(".file-chip");
  var changeBtn=document.querySelector(".change-file");
  function receive(f){if(f&&box._arkSetFile)box._arkSetFile(f)}
  if(dz){
   dz.addEventListener("dragover",function(e){e.preventDefault();dz.classList.add("drag")});
   dz.addEventListener("dragleave",function(){dz.classList.remove("drag")});
   dz.addEventListener("drop",function(e){e.preventDefault();dz.classList.remove("drag");if(e.dataTransfer.files[0])receive(e.dataTransfer.files[0])});
  }
  if(input)input.addEventListener("change",function(){if(input.files[0])receive(input.files[0])});
  if(chip){
   chip.addEventListener("dragstart",function(e){__arkDragging=true;try{e.dataTransfer.setData("text/plain","arkfile");e.dataTransfer.effectAllowed="copyMove"}catch(err){}});
   chip.addEventListener("dragend",function(){__arkDragging=false;});
  }
  if(changeBtn)changeBtn.addEventListener("click",function(){
   box._arkFile=null;
   var stage=document.querySelector(".stage2");if(stage)stage.hidden=true;
   if(dz)dz.hidden=false;
   if(chip)chip.textContent="";
   var dl=box.querySelector(".download");if(dl){dl.hidden=true;dl.style.display="none"}
   var st=box.querySelector(".status");if(st){st.textContent="Drag the file onto a format.";st.className="status"}
   var ea=box.querySelector(".err-actions");if(ea)ea.hidden=true;
   var cen=box.querySelector(".centre");if(cen){var s2=cen.querySelector(".small");if(s2)s2.textContent="Release the file on a format";cen.setAttribute("draggable","false")}
   var bar=box.querySelector(".progress i");if(bar)bar.style.width="0%";
   if(input)input.value="";
  });
 }
 var mw=document.querySelector(".main-wheel");
 if(mw){
  mw.innerHTML="";
  buildWedgeSVG(mw,[
   {label:"\u25a4 Documents",value:"document"},{label:"\u25cd Images",value:"image"},
   {label:"\u25b6 Video & Audio",value:"video"},{label:"\u25a6 Data",value:"data"}
  ],{onSelect:function(v){ location.href="/tools.html?cat="+v; },onDrop:function(){}});
  var mc=document.createElement("div");mc.className="mw-centre";mc.textContent="Choose a category";mw.appendChild(mc);
 }
 /* blog list */
 var list=document.getElementById("blogList");
 if(list&&window.ARK_BLOG_POSTS){list.innerHTML=window.ARK_BLOG_POSTS.map(function(p){return '<article class="card"><h3><a href="/blog/post.html?slug='+p.slug+'">'+esc(p.title)+"</a></h3><p class='muted small'>"+esc(p.date)+"</p><p>"+esc(p.excerpt)+"</p></article>"}).join("")}
 var preview=document.getElementById("blogPreview");
 if(preview&&window.ARK_BLOG_POSTS){preview.innerHTML=window.ARK_BLOG_POSTS.map(function(p){return '<article class="card"><h3><a href="/blog/post.html?slug='+p.slug+'">'+esc(p.title)+"</a></h3><p>"+esc(p.excerpt)+'</p></article>'}).join("")}
 var postEl=document.getElementById("blogPost");
 if(postEl&&window.ARK_BLOG_POSTS){var slug=new URLSearchParams(location.search).get("slug");var post=window.ARK_BLOG_POSTS.filter(function(p){return p.slug===slug})[0]||window.ARK_BLOG_POSTS[0];document.title=post.title+" | arkConvert";postEl.innerHTML="<p class='muted small'>"+esc(post.date)+" • arkConvert Blog</p><h1>"+esc(post.title)+"</h1><p class='lead'>"+esc(post.excerpt)+"</p>"+post.body+"<p><a href='/blog/'>← All blog posts</a></p>"}
});
})();
