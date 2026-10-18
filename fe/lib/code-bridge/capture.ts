import { CAPTURE_H, CAPTURE_W } from "./types";

// Đoạn script gắn vào cuối tài liệu của vật khi chụp. Nó chạy TRONG iframe cô lập (sandbox="allow-scripts", nguồn gốc mờ),
// chọn phần tử <svg> hoặc <canvas> lớn nhất, vẽ lại đúng chỗ nó đang hiện lên một canvas CAPTURE_W × CAPTURE_H (độ phân giải ×2)
// trên màu nền của trang, rồi gửi PNG lên trang cha bằng postMessage. Với SVG, kiểu đã tính (gồm cả CSS và biến CSS) được gắn
// thẳng vào bản sao trước khi đổi thành ảnh, nên hình chụp khớp với hình đang hiện. Thời điểm chụp: sau `load` + 900 ms,
// hoặc theo <meta name="capture-delay" content="ms"> trong tài liệu.
const PROPS = ["fill", "stroke", "stroke-width", "stroke-opacity", "fill-opacity", "fill-rule", "opacity", "stroke-linecap", "stroke-linejoin",
  "stroke-dasharray", "stroke-dashoffset", "font-family", "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline",
  "letter-spacing", "visibility", "display", "filter", "mix-blend-mode", "stop-color", "stop-opacity", "transform", "transform-origin",
  "transform-box", "paint-order", "clip-path", "mask"];

function captureScript(id: string, rev: number) {
  return `<script>(function(){
var ID=${JSON.stringify(id)},REV=${rev},W=${CAPTURE_W},H=${CAPTURE_H},K=2,PROPS=${JSON.stringify(PROPS)};
function send(m){m.__codeBridge="snapshot";m.id=ID;m.rev=REV;parent.postMessage(m,"*");}
function fail(e){send({error:String(e&&e.message||e)+info()});}
var seen=[];
function pick(){var best=null,area=0,first=null;document.querySelectorAll("svg,canvas").forEach(function(el){if(el.parentElement&&el.parentElement.closest("svg"))return;var r=el.getBoundingClientRect(),a=r.width*r.height;seen.push(el.tagName.toLowerCase()+" "+Math.round(r.width)+"x"+Math.round(r.height));if(!first)first=el;if(a>area){area=a;best=el;}});return best||first;}
function frame(el){var r=el.getBoundingClientRect();return r.width>0&&r.height>0?r:{left:0,top:0,width:W,height:H};}
function info(){return " [khung "+document.documentElement.clientWidth+"x"+document.documentElement.clientHeight+", thấy "+(seen.length?seen.join(", "):"không có phần tử nào")+"]";}
function bg(){var list=[document.body,document.documentElement];for(var i=0;i<list.length;i++){if(!list[i])continue;var c=getComputedStyle(list[i]).backgroundColor;if(c&&c!=="transparent"&&c!=="rgba(0, 0, 0, 0)")return c;}return "#ffffff";}
var TEMPLATE={defs:1,clippath:1,mask:1,symbol:1,pattern:1,marker:1,lineargradient:1,radialgradient:1,filter:1,style:1,script:1,title:1,desc:1};
// Phần tử mẫu (trong defs, clipPath...) giữ nguyên thuộc tính gốc: gắn kiểu đã tính vào chúng sẽ đè màu mà <use> truyền xuống.
function inline(src,dst){if(TEMPLATE[src.tagName.toLowerCase()])return;var cs=getComputedStyle(src),s="";for(var i=0;i<PROPS.length;i++){var v=cs.getPropertyValue(PROPS[i]);if(v)s+=PROPS[i]+":"+v+";";}dst.setAttribute("style",s);for(var j=0;j<src.children.length;j++)inline(src.children[j],dst.children[j]);}
function done(cv){try{send({png:cv.toDataURL("image/png")});}catch(e){fail(e);}}
function shoot(){try{
var el=pick();if(!el)return fail("Không thấy <svg> hay <canvas> nào để chụp: vẽ vật bằng SVG hoặc Canvas.");
var r=frame(el),cv=document.createElement("canvas");cv.width=W*K;cv.height=H*K;
var ctx=cv.getContext("2d");ctx.scale(K,K);ctx.fillStyle=bg();ctx.fillRect(0,0,W,H);
if(el.tagName.toLowerCase()==="canvas"){ctx.drawImage(el,r.left,r.top,r.width,r.height);return done(cv);}
var clone=el.cloneNode(true);inline(el,clone);
clone.setAttribute("xmlns","http://www.w3.org/2000/svg");clone.setAttribute("xmlns:xlink","http://www.w3.org/1999/xlink");
clone.setAttribute("width",r.width);clone.setAttribute("height",r.height);
var img=new Image();img.onload=function(){ctx.drawImage(img,r.left,r.top,r.width,r.height);done(cv);};
img.onerror=function(){fail("Trình duyệt không dựng được ảnh từ SVG (có thể vì <foreignObject> hay ảnh ngoài).");};
img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(clone));
}catch(e){fail(e);}}
var meta=document.querySelector('meta[name="capture-delay"]'),delay=Math.min(15000,Math.max(0,Number(meta&&meta.content)||900));
function later(){setTimeout(shoot,delay);}
if(document.readyState==="complete")later();else addEventListener("load",later);
})();</script>`;
}

/** Tài liệu của vật kèm đoạn chụp ảnh, chèn ngay trước </body> (hoặc cuối tài liệu nếu không có). */
export function withCapture(html: string, id: string, rev: number): string {
  const script = captureScript(id, rev);
  const at = html.toLowerCase().lastIndexOf("</body>");
  return at >= 0 ? html.slice(0, at) + script + html.slice(at) : html + script;
}
