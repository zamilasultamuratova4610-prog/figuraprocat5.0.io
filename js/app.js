// ── FONT ──
let robotoB64=null,fontOK=false;
async function loadFont(){
  try{
    const r=await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf");
    if(!r.ok)throw 0;const ab=await r.arrayBuffer();const u8=new Uint8Array(ab);let bin="";
    for(let i=0;i<u8.length;i+=8192)bin+=String.fromCharCode.apply(null,u8.subarray(i,Math.min(i+8192,u8.length)));
    robotoB64=btoa(bin);fontOK=true;
  }catch(e){console.warn("Font fail",e)}
}
loadFont();

// ── HELPERS ──
const escMap={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};
const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>escMap[ch]);
const escAttr=v=>esc(v).replace(/`/g,"&#96;");
const cleanBase=v=>String(v??"").replace(/\u0000/g,"").replace(/[<>&]/g,ch=>({"<":"‹",">":"›","&":"＆"}[ch])).replace(/\r/g,"");
const safeLine=v=>cleanBase(v).replace(/\s+/g," ").trim();
const safeMultiline=v=>cleanBase(v).replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
const safePhone=v=>String(v??"").replace(/[^\d+]/g,"");
const safeImgSrc=v=>{const s=String(v??"").trim();return /^(data:image\/(?:png|jpe?g|webp|gif|svg\+xml);base64,|https?:\/\/|blob:)/i.test(s)?s:""};
const toNum=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
const toLocalISODate=d=>{const copy=new Date(d);copy.setMinutes(copy.getMinutes()-copy.getTimezoneOffset());return copy.toISOString().split("T")[0]};
const CUR="\u20B8",fmt=n=>toNum(n).toLocaleString("ru-KZ")+" "+CUR,gid=()=>Math.random().toString(36).slice(2,11);
const fmtD=d=>d?new Date(d).toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric"}):"";
const fmtDs=d=>d?new Date(d).toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit"}):"";
const daysN=(a,b)=>{const s=new Date(a),e=new Date(b);if(Number.isNaN(s.getTime())||Number.isNaN(e.getTime())||e<s)return 0;return Math.max(1,Math.ceil((e-s)/864e5))};
const isValidDateRange=(a,b)=>daysN(a,b)>0;
const today=()=>toLocalISODate(new Date());
const addD=n=>{const d=new Date();d.setDate(d.getDate()+n);return toLocalISODate(d)};
const diffD=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
const MO=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const CATS=["Детский","Юниорский","Взрослый"];
const DEF_SIZES="98-104,110-116,122-128,134-140,146-152,158-164,XS (42),S (44),M (46),L (48),XL (50),XXL (52)".split(",");

let customSizes=[...DEF_SIZES]; // 🔥 Загрузится из Firebase при init
function getSizes(){return customSizes}

// 🔥 FIREBASE: Сохранить размеры
function saveSizes(){
  customSizes=sanitizeSizeList(customSizes);
  return db.collection('fp_settings').doc('sizes').set({list:customSizes},{merge:true}).catch(e=>{console.error("Sizes save err:",e);throw e});
}

const MATS=["Лайкра","Бифлекс","Стрейч","Велюр","Сетка","Комбинированный","Бархат","Микрофибра"];
const DECS=["Стразы Swarovski","Термостразы","Перья","Вышивка","Паетки","Бисер","Без декора"];
const STYS=["Классика","Лирика","Характерный","Народный","Произвольная","Джаз","Танцы на льду"];
const ST={available:{l:"Свободно",c:"sa",d:"#10b981",rc:"rib-av",i:"✅"},booked:{l:"Забронировано",c:"sb2",d:"#f59e0b",rc:"rib-bk",i:"🕐"},rented:{l:"В прокате",c:"sr",d:"#f43f5e",rc:"rib-rn",i:"🚫"},returned:{l:"Возвращено",c:"srt",d:"#3b82f6",rc:"rib-rt",i:"🔄"}};
const sanitizeSizeList=list=>[...new Set((Array.isArray(list)?list:DEF_SIZES).map(safeLine).filter(Boolean))];
function normalizeDress(id,data={}){
  return{
    id:String(data.id||id||gid()),
    name:safeLine(data.name),
    category:CATS.includes(data.category)?data.category:CATS[0],
    size:safeLine(data.size||DEF_SIZES[0]),
    material:MATS.includes(data.material)?data.material:MATS[0],
    decoration:DECS.includes(data.decoration)?data.decoration:DECS[DECS.length-1],
    style:STYS.includes(data.style)?data.style:STYS[0],
    price:Math.max(0,toNum(data.price,0)),
    deposit:Math.max(0,toNum(data.deposit,0)),
    description:safeMultiline(data.description),
    photos:(Array.isArray(data.photos)?data.photos:[]).map(safeImgSrc).filter(Boolean).slice(0,8),
    rating:Math.min(5,Math.max(0,toNum(data.rating,5))),
    rentCount:Math.max(0,toNum(data.rentCount,0)),
    isDraft:Boolean(data.isDraft),
    createdAt:toNum(data.createdAt,Date.now()),
    updatedAt:toNum(data.updatedAt,Date.now())
  };
}
function normalizeRental(id,data={}){
  const start=/^\d{4}-\d{2}-\d{2}$/.test(String(data.startDate||"").trim())?String(data.startDate).trim():today();
  const rawEnd=/^\d{4}-\d{2}-\d{2}$/.test(String(data.endDate||"").trim())?String(data.endDate).trim():start;
  const end=isValidDateRange(start,rawEnd)?rawEnd:start;
  const status=ST[data.status]?data.status:"booked";
  return{
    id:String(data.id||id||gid()),
    dressId:safeLine(data.dressId),
    clientName:safeLine(data.clientName),
    clientPhone:safePhone(data.clientPhone),
    startDate:start,
    endDate:end,
    status,
    notes:safeMultiline(data.notes),
    totalPrice:Math.max(0,toNum(data.totalPrice,0))
  };
}
function refreshVisibleDresses(){dresses=allDresses.filter(d=>!d.isDraft)}
function upsertLocalDress(d){const idx=allDresses.findIndex(x=>x.id===d.id);if(idx>=0)allDresses.splice(idx,1,d);else allDresses.push(d);refreshVisibleDresses()}
function upsertLocalRental(r){const idx=rentals.findIndex(x=>x.id===r.id);if(idx>=0)rentals.splice(idx,1,r);else rentals.push(r)}

// ── DEFAULT DATA (для первого запуска) ──
const DEFAULT_DRESSES=[
  {id:"c1",name:"Снежинка",category:"Детский",size:"122-128",material:"Лайкра",decoration:"Термостразы",style:"Лирика",price:12000,deposit:20000,description:"Нежное белоснежное платье с серебристыми кристаллами.",photos:[],rating:5,rentCount:18},
  {id:"c2",name:"Огонь льда",category:"Юниорский",size:"146-152",material:"Бифлекс",decoration:"Стразы Swarovski",style:"Характерный",price:18000,deposit:35000,description:"Ярко-красный костюм с золотыми стразами.",photos:[],rating:5,rentCount:12},
  {id:"c3",name:"Лебединое озеро",category:"Взрослый",size:"S (44)",material:"Комбинированный",decoration:"Перья",style:"Классика",price:35000,deposit:60000,description:"Классический белый костюм с перьями.",photos:[],rating:5,rentCount:9},
  {id:"c4",name:"Звёздная ночь",category:"Взрослый",size:"M (46)",material:"Лайкра",decoration:"Стразы Swarovski",style:"Произвольная",price:28000,deposit:50000,description:"Тёмно-синий костюм со стразами.",photos:[],rating:4,rentCount:15},
  {id:"c5",name:"Маленькая принцесса",category:"Детский",size:"110-116",material:"Бифлекс",decoration:"Паетки",style:"Лирика",price:9000,deposit:15000,description:"Розовое платье с паетками.",photos:[],rating:5,rentCount:22},
  {id:"c6",name:"Фламенко",category:"Взрослый",size:"S (44)",material:"Бархат",decoration:"Вышивка",style:"Характерный",price:32000,deposit:55000,description:"Бордовый костюм с вышивкой.",photos:[],rating:4,rentCount:7},
  {id:"c7",name:"Ледяная королева",category:"Юниорский",size:"158-164",material:"Комбинированный",decoration:"Стразы Swarovski",style:"Произвольная",price:22000,deposit:40000,description:"Голубой костюм с серебристыми стразами.",photos:[],rating:5,rentCount:11},
  {id:"c8",name:"Джаз на льду",category:"Взрослый",size:"XS (42)",material:"Лайкра",decoration:"Паетки",style:"Джаз",price:24000,deposit:42000,description:"Чёрный костюм с золотыми паетками.",photos:[],rating:4,rentCount:6}
];
const DEFAULT_RENTALS=[
  {id:"r1",dressId:"c1",clientName:"Алина Захарова",clientPhone:"+7(701)123-45-67",startDate:addD(-5),endDate:addD(-1),status:"rented",notes:"Соревнования",totalPrice:48000},
  {id:"r2",dressId:"c2",clientName:"Диана Нурова",clientPhone:"+7(702)234-56-78",startDate:addD(0),endDate:addD(1),status:"rented",notes:"Чемпионат",totalPrice:36000},
  {id:"r3",dressId:"c3",clientName:"Карина Белова",clientPhone:"+7(705)345-67-89",startDate:addD(-15),endDate:addD(-12),status:"returned",notes:"",totalPrice:105000},
  {id:"r4",dressId:"c5",clientName:"Зоя Смирнова",clientPhone:"+7(707)456-78-90",startDate:addD(5),endDate:addD(9),status:"booked",notes:"День рождения",totalPrice:36000},
  {id:"r5",dressId:"c7",clientName:"Лина Касымова",clientPhone:"+7(708)567-89-01",startDate:addD(-1),endDate:addD(0),status:"rented",notes:"Турнир",totalPrice:44000}
];

// ── STATE ──
let allDresses=DEFAULT_DRESSES.map(d=>normalizeDress(d.id,d));
let dresses=allDresses.filter(d=>!d.isDraft);
let rentals=DEFAULT_RENTALS.map(r=>normalizeRental(r.id,r));
let curTab="catalog",calY=new Date().getFullYear(),calM=new Date().getMonth(),calSel=null;
let renFil="all",editDress=null,editRental=null,detPhIdx=0,formPhotos=[],formStatus="booked";
let clStatFil="all",dismissedN=new Set();
let appReady=false,dressDraftId=null,dressDraftTouched=false,dressAutosaveTimer=null,dressSaveSeq=0;

// ═══════════════════════════════════════════
// 🔥 FIREBASE: Функции сохранения / удаления
// ═══════════════════════════════════════════
function fbSaveDress(d){
  const payload=normalizeDress(d.id,d);
  return db.collection('fp_dresses').doc(payload.id).set(payload,{merge:true}).then(()=>payload).catch(e=>{console.error("Dress save err:",e);throw e});
}
function fbDeleteDress(id){
  return db.collection('fp_dresses').doc(id).delete().catch(e=>{console.error("Dress del err:",e);throw e});
}
function fbSaveRental(r){
  const payload=normalizeRental(r.id,r);
  return db.collection('fp_rentals').doc(payload.id).set(payload,{merge:true}).then(()=>payload).catch(e=>{console.error("Rental save err:",e);throw e});
}
function fbDeleteRental(id){
  return db.collection('fp_rentals').doc(id).delete().catch(e=>{console.error("Rental del err:",e);throw e});
}

async function ensureSeedData(){
  const dSnap=await db.collection('fp_dresses').get();
  if(dSnap.empty)await Promise.all(DEFAULT_DRESSES.map(d=>fbSaveDress(d)));
  const rSnap=await db.collection('fp_rentals').get();
  if(rSnap.empty)await Promise.all(DEFAULT_RENTALS.map(r=>fbSaveRental(r)));
  const sDoc=await db.collection('fp_settings').doc('sizes').get();
  if(!sDoc.exists)await saveSizes();
}
function watchFirestore(ref,handler,label){
  return new Promise((resolve,reject)=>{
    let first=true;
    const unsub=ref.onSnapshot(snap=>{
      handler(snap);
      if(first){first=false;resolve(unsub)}
    },e=>{
      console.error(`${label} sync err:`,e);
      if(first){first=false;reject(e)}
      else showToast(`Ошибка синхронизации: ${label}`,"error");
    });
  });
}
async function startRealtimeSync(){
  await Promise.all([
    watchFirestore(db.collection('fp_dresses'),snap=>{
      allDresses=snap.docs.map(doc=>normalizeDress(doc.id,doc.data()));
      refreshVisibleDresses();
      if(appReady)renderAll();
    },"каталог"),
    watchFirestore(db.collection('fp_rentals'),snap=>{
      rentals=snap.docs.map(doc=>normalizeRental(doc.id,doc.data())).filter(r=>r.dressId);
      if(appReady)renderAll();
    },"прокаты"),
    watchFirestore(db.collection('fp_settings').doc('sizes'),snap=>{
      customSizes=sanitizeSizeList(snap.exists&&snap.data()?.list?snap.data().list:DEF_SIZES);
      if(appReady){initF();renderAll();}
    },"размеры")
  ]);
  console.log("✅ Firebase: загружено",dresses.length,"платьев,",rentals.length,"прокатов");
}

const gDS=id=>{const r=rentals.find(r=>r.dressId===id&&r.status!=="returned");return r?r.status:"available"};
const gAR=id=>rentals.find(r=>r.dressId===id&&r.status!=="returned");
const gD=id=>allDresses.find(d=>d.id===id);
const stars=(r,n=5)=>[...Array(n)].map((_,i)=>`<span style="color:${i<r?"#fbbf24":"var(--g200)"}">★</span>`).join("");
function compImg(file){return new Promise(res=>{const r=new FileReader();r.onload=e=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");let w=img.width,h=img.height;if(w>600){h=h*600/w;w=600}c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);res(c.toDataURL("image/jpeg",.75))};img.src=e.target.result};r.readAsDataURL(file)})}
function checkOverlap(dressId,startDate,endDate,excludeRentalId){
  if(!isValidDateRange(startDate,endDate))return[];
  const start=new Date(startDate),end=new Date(endDate);
  return rentals.filter(r=>{if(r.dressId!==dressId)return false;if(r.status==="returned")return false;if(excludeRentalId&&r.id===excludeRentalId)return false;return start<=new Date(r.endDate)&&end>=new Date(r.startDate)});
}
function getDressBookings(dressId){
  return rentals.filter(r=>r.dressId===dressId&&r.status!=="returned").map(r=>({start:r.startDate,end:r.endDate,status:r.status,client:r.clientName}));
}
function calcSuggestedTotal(dressId,startDate,endDate){
  const dress=gD(dressId),days=daysN(startDate,endDate);
  if(!dress||days<1)return 0;
  return Math.max(0,days*toNum(dress.price,0));
}
function markTotalManual(inputId){
  const el=document.getElementById(inputId);
  if(el)el.dataset.manual="1";
}
function syncTotalInput(inputId,suggested){
  const el=document.getElementById(inputId);
  if(!el)return;
  const safeSuggested=Math.max(0,toNum(suggested,0));
  const prevSuggested=toNum(el.dataset.suggested,NaN);
  const current=toNum(el.value,NaN);
  const shouldAutofill=!el.value||el.dataset.manual!=="1"||(!Number.isNaN(prevSuggested)&&current===prevSuggested);
  if(shouldAutofill){
    el.value=String(safeSuggested);
    el.dataset.manual="0";
  }
  el.dataset.suggested=String(safeSuggested);
}
function applySuggestedTotal(inputId){
  const el=document.getElementById(inputId);
  if(!el)return;
  el.value=el.dataset.suggested||"0";
  el.dataset.manual="0";
}
function readTotalInput(inputId){
  return Math.max(0,toNum(document.getElementById(inputId)?.value,0));
}
function getImgDims(src){return new Promise(res=>{const img=new Image();img.onload=()=>res({w:img.naturalWidth,h:img.naturalHeight});img.onerror=()=>res({w:1,h:1});img.src=src})}
function fitInBox(imgW,imgH,boxW,boxH){const ir=imgW/imgH,br=boxW/boxH;let w,h;if(ir>br){w=boxW;h=boxW/ir}else{h=boxH;w=boxH*ir}return{x:(boxW-w)/2,y:(boxH-h)/2,w,h}}

function showToast(m,t="success"){const w=document.getElementById("toastWrap"),el=document.createElement("div"),txt=document.createElement("span"),btn=document.createElement("button");el.className="toast "+t;txt.textContent=String(m??"");btn.className="tc";btn.type="button";btn.textContent="✕";btn.onclick=()=>el.remove();el.appendChild(txt);el.appendChild(btn);w.appendChild(el);setTimeout(()=>{if(el.parentElement)el.remove()},4000)}
function setDressSaveHint(message,state=""){const el=document.getElementById("dressSaveHint");if(!el)return;el.textContent=message||"";el.style.color=state==="error"?"#ef4444":"var(--g500)"}
function closeModal(){clearTimeout(dressAutosaveTimer);dressAutosaveTimer=null;dressDraftTouched=false;dressDraftId=null;document.getElementById("mov").style.display="none";document.getElementById("moBox").classList.remove("wide")}
function closeMOV(e){if(e.target===e.currentTarget)closeModal()}

// ── NOTIFICATIONS ──
function getNotifs(){
  const n=[],td=today();
  rentals.forEach(r=>{if(r.status==="rented"){const diff=diffD(td,r.endDate);if(diff<0)n.push({id:"ov_"+r.id,type:"overdue",r,days:Math.abs(diff),t:"Просрочен возврат!",d:`${r.clientName} — ${gD(r.dressId)?.name||"?"} на ${Math.abs(diff)} дн.`,cls:"dng"});else if(diff<=1)n.push({id:"ex_"+r.id,type:"expiring",r,t:diff===0?"Возврат СЕГОДНЯ!":"Возврат ЗАВТРА!",d:`${r.clientName} — ${gD(r.dressId)?.name||"?"}`,cls:"wrn"})}});
  return n.sort((a,b)=>(a.type==="overdue"?0:1)-(b.type==="overdue"?0:1));
}
function renderNotifs(){
  const ns=getNotifs(),active=ns.filter(n=>!dismissedN.has(n.id));
  const badge=document.getElementById("bellB"),btn=document.getElementById("bellBtn");
  if(active.length){badge.textContent=active.length;badge.classList.remove("hid");btn.classList.add("has-n")}else{badge.classList.add("hid");btn.classList.remove("has-n")}
  const list=document.getElementById("nList");
  if(!active.length){list.innerHTML=`<div style="text-align:center;padding:32px;color:var(--g400)"><div style="font-size:36px;margin-bottom:8px">✅</div>Всё в порядке!</div>`;return}
  list.innerHTML=active.map(n=>`<div class="ni" onclick="handleNClick('${n.r.id}')"><div class="ni-ico ${n.cls}">${n.type==="overdue"?"🚨":"⚠️"}</div><div class="ni-info"><div class="ni-t">${n.t}</div><div class="ni-d">${n.d}</div></div></div>`).join("");
}
function renderAlerts(){
  const ns=getNotifs();
  document.getElementById("alertsBar").innerHTML=ns.filter(n=>n.type==="overdue").map(n=>{const d=gD(n.r.dressId);return`<div class="abanner dng"><div class="ab-ico">🚨</div><div class="ab-body"><div class="ab-t">ПРОСРОЧЕН: ${d?d.name:"?"}</div><div class="ab-d">${n.r.clientName} (${n.r.clientPhone}) — на ${n.days} дн.</div></div><button class="ab-act ret" onclick="chRS('${n.r.id}','returned')">Вернуть</button></div>`}).join("")+ns.filter(n=>n.type==="expiring").map(n=>{const d=gD(n.r.dressId);return`<div class="abanner wrn"><div class="ab-ico">⚠️</div><div class="ab-body"><div class="ab-t">${n.t}: ${d?d.name:"?"}</div><div class="ab-d">${n.r.clientName} (${n.r.clientPhone})</div></div><button class="ab-act call" onclick="window.open('tel:${n.r.clientPhone.replace(/[^+\\d]/g,"")}')">Позвонить</button></div>`}).join("");
}
function toggleNP(){document.getElementById("nPanel").classList.toggle("open")}
function dismissN(){getNotifs().forEach(n=>dismissedN.add(n.id));renderNotifs()}
function handleNClick(rid){document.getElementById("nPanel").classList.remove("open");switchTab("rentals")}
document.addEventListener("click",e=>{const p=document.getElementById("nPanel"),b=document.getElementById("bellBtn");if(!p.contains(e.target)&&!b.contains(e.target))p.classList.remove("open")});

// ── TABS ──
function switchTab(t){
  curTab=t;document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".nb").forEach(x=>x.classList.remove("active"));
  document.getElementById("tab-"+t).classList.add("active");document.querySelectorAll(".nb")[["catalog","calendar","rentals","client"].indexOf(t)].classList.add("active");
  document.getElementById("gab").classList.toggle("hidden",t==="client");document.getElementById("statsBar").style.display=t==="client"?"none":"";
  document.getElementById("alertsBar").style.display=t==="client"?"none":"";
  document.getElementById("abl").textContent=t==="rentals"?"Прокат":"Костюм";
  if(t==="calendar")renderCal2();if(t==="rentals")renderRen();if(t==="catalog")renderCat();if(t==="client")renderCl();
}
function openAddM(){curTab==="rentals"?openRenM(null,null):openDressM(null)}

function renderStats(){
  const a=rentals.filter(r=>r.status==="rented").length,b=rentals.filter(r=>r.status==="booked").length;
  const rev=rentals.filter(r=>r.status!=="booked").reduce((s,r)=>s+(r.totalPrice||0),0);
  document.getElementById("statsBar").innerHTML=`<div class="sc"><div class="sv">${dresses.length}</div><div class="sl">Костюмов</div></div><div class="sc"><div class="sv">${a}</div><div class="sl">В прокате</div></div><div class="sc"><div class="sv">${b}</div><div class="sl">Забронировано</div></div><div class="sc"><div class="sv">${fmt(rev)}</div><div class="sl">Выручка</div></div>`;
}

function initF(){
  ["fSize","clSizeF"].forEach(id=>{const s=document.getElementById(id);const cv=s.value;s.innerHTML='<option value="">Все размеры</option>';getSizes().forEach(sz=>{const o=document.createElement("option");o.value=sz;o.textContent=sz;s.appendChild(o)});s.value=cv});
  const ms=document.getElementById("fMat");ms.innerHTML='<option value="">Все материалы</option>';MATS.forEach(m=>{const o=document.createElement("option");o.value=m;o.textContent=m;ms.appendChild(o)});
}

// ── SIZES MANAGER ──
function openSizesM(){
  document.getElementById("moTitle").textContent="⚙️ Управление размерами";
  document.getElementById("moBox").classList.remove("wide");document.getElementById("mov").style.display="flex";
  renderSizesBody();
}
function renderSizesBody(){
  document.getElementById("moBody").innerHTML=`
    <p style="font-size:12px;color:var(--g500);margin-bottom:14px">Добавляйте и удаляйте размеры. Они доступны при создании костюмов и в фильтрах.</p>
    <div class="sz-list">${getSizes().map((s,i)=>`<div class="sz-tag">${s}<button class="sz-del" onclick="rmSizeItem(${i})">✕</button></div>`).join("")}</div>
    <div class="sz-add-row"><input class="sz-inp" id="newSizeInp" placeholder="Новый размер, напр: 170-176" onkeydown="if(event.key==='Enter')addSizeItem()"><button class="sz-add-btn" onclick="addSizeItem()">+ Добавить</button></div>
    <div class="fbtns" style="margin-top:24px"><button class="bcn" onclick="closeModal()">Закрыть</button><button class="bsb" onclick="resetSizesToDef()">↺ Сбросить</button></div>`;
}
function addSizeItem(){const v=document.getElementById("newSizeInp").value.trim();if(!v){showToast("Введите размер","error");return}if(customSizes.includes(v)){showToast("Уже есть","warn");return}customSizes.push(v);saveSizes();initF();renderSizesBody();showToast("Размер добавлен!")}
function rmSizeItem(i){customSizes.splice(i,1);saveSizes();initF();renderSizesBody();showToast("Удалён","info")}
function resetSizesToDef(){customSizes=[...DEF_SIZES];saveSizes();initF();renderSizesBody();showToast("Сброшено к стандартным")}

// ── CATALOG ──
function getAlert(did){const r=gAR(did);if(!r||r.status!=="rented")return null;const d=diffD(today(),r.endDate);return d<0?"overdue":d<=1?"expiring":null}
function renderCat(){
  const q=document.getElementById("catSearch").value.toLowerCase(),cat=document.getElementById("fCat").value,sz=document.getElementById("fSize").value,st=document.getElementById("fStat").value,mt=document.getElementById("fMat").value;
  let list=dresses.filter(d=>{if(q&&!d.name.toLowerCase().includes(q)&&!d.style.toLowerCase().includes(q)&&!d.decoration.toLowerCase().includes(q))return false;if(cat&&d.category!==cat)return false;if(sz&&d.size!==sz)return false;if(mt&&d.material!==mt)return false;if(st&&gDS(d.id)!==st)return false;return true});
  const g=document.getElementById("dressGrid");
  if(!list.length){g.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="empty-ico">⛸️</div><h3>Не найдено</h3><button class="empty-btn" onclick="openDressM(null)">Добавить</button></div>`;return}
  g.innerHTML=list.map(d=>{
    const s=gDS(d.id),cfg=ST[s],ar=gAR(d.id),al=getAlert(d.id);
    const ph=d.photos?.length?`<img src="${d.photos[0]}">`:`<div class="dph">⛸️<span>Нет фото</span></div>`;
    const alB=al==="overdue"?`<div class="ov-badge">ПРОСРОЧЕН!</div>`:al==="expiring"?`<div class="ex-badge">Скоро возврат</div>`:"";
    return`<div class="dc ${al||""}" onclick="openDetM('${d.id}')"><div class="dp2">${ph}<div class="sbadge ${cfg.c}"><div class="sdot"></div>${cfg.l}</div><div class="ca2" onclick="event.stopPropagation()"><button class="cab" onclick="openDressM('${d.id}')">✏️</button><button class="cab" onclick="delDress('${d.id}')">🗑️</button></div>${alB}</div><div class="di"><div class="dn">${d.name}</div><div class="dcat">${d.category} · ${d.style}</div><div class="dtags"><span class="tag">${d.size}</span><span class="tag">${d.material}</span></div><div class="df2"><div><div class="dpr">${fmt(d.price)}<span class="dprs">/сут</span></div><div class="ddep">Залог: ${fmt(d.deposit)}</div></div>${s==="available"?`<button class="rbtn" onclick="event.stopPropagation();openRenM(null,'${d.id}')">Сдать</button>`:""}</div>${ar?`<div class="dcl2">👤 <strong>${ar.clientName}</strong> до ${fmtD(ar.endDate)}</div>`:""}</div></div>`;
  }).join("");
}

// 🔥 FIREBASE: Удаление платья + связанных прокатов
function delDress(id){
  if(!confirm("Удалить?"))return;
  const relRentals=rentals.filter(r=>r.dressId===id);
  allDresses=allDresses.filter(d=>d.id!==id);
  refreshVisibleDresses();
  rentals=rentals.filter(r=>r.dressId!==id);
  fbDeleteDress(id);
  relRentals.forEach(r=>fbDeleteRental(r.id));
  renderAll();showToast("Удалён","info");
}

// ── DRESS MODAL ──
function queueDressAutosave(){
  dressDraftTouched=true;
  clearTimeout(dressAutosaveTimer);
  setDressSaveHint("Сохраняем изменения...");
  dressAutosaveTimer=setTimeout(()=>{persistDressDraft(false).catch(()=>{})},500);
}
function collectDressFormData(){
  const base=editDress||gD(dressDraftId)||{};
  return normalizeDress(dressDraftId||base.id||gid(),{
    ...base,
    name:document.getElementById("dName")?.value,
    category:document.getElementById("dCat")?.value,
    size:document.getElementById("dSize")?.value,
    material:document.getElementById("dMat")?.value,
    decoration:document.getElementById("dDec")?.value,
    style:document.getElementById("dStyle")?.value,
    price:document.getElementById("dPrice")?.value,
    deposit:document.getElementById("dDep")?.value,
    description:document.getElementById("dDesc")?.value,
    photos:[...formPhotos],
    isDraft:!editDress,
    updatedAt:Date.now()
  });
}
async function persistDressDraft(finalize=false){
  if(!document.getElementById("dName"))return false;
  const draft=collectDressFormData();
  const meaningful=draft.name||draft.description||draft.photos.length||draft.price||draft.deposit;
  if(!meaningful&&!finalize)return false;
  if(finalize&&!draft.name){showToast("Название!","error");return false}
  if(finalize&&!draft.price){showToast("Цену!","error");return false}
  const payload={...draft,isDraft:editDress?false:!finalize,updatedAt:Date.now()};
  const token=++dressSaveSeq;
  try{
    const saved=await fbSaveDress(payload);
    upsertLocalDress(saved);
    renderAll();
    setDressSaveHint(finalize?"Сохранено":"Черновик сохранён");
    dressDraftTouched=false;
    if(finalize)editDress=saved;
    return true;
  }catch(e){
    if(token===dressSaveSeq)setDressSaveHint("Ошибка сохранения","error");
    showToast("Не удалось сохранить карточку","error");
    return false;
  }
}
function openDressM(id){
  editDress=id?gD(id):null;dressDraftId=editDress?editDress.id:gid();dressDraftTouched=false;formPhotos=editDress?[...(editDress.photos||[])]:[];
  document.getElementById("moTitle").textContent=editDress?"Редактировать":"Новый костюм";
  document.getElementById("moBox").classList.remove("wide");document.getElementById("mov").style.display="flex";
  const d=editDress||{};
  document.getElementById("moBody").innerHTML=`
    <div class="fg"><label class="fl">Название *</label><input class="fi" id="dName" value="${escAttr(d.name||"")}" oninput="queueDressAutosave()"></div>
    <div class="fgrid"><div class="fg"><label class="fl">Категория</label><select class="fse" id="dCat" onchange="queueDressAutosave()">${CATS.map(c=>`<option ${d.category===c?"selected":""}>${c}</option>`).join("")}</select></div><div class="fg"><label class="fl">Размер</label><select class="fse" id="dSize" onchange="queueDressAutosave()">${getSizes().map(s=>`<option ${d.size===s?"selected":""}>${s}</option>`).join("")}</select></div></div>
    <div class="fgrid3"><div class="fg"><label class="fl">Материал</label><select class="fse" id="dMat" onchange="queueDressAutosave()">${MATS.map(m=>`<option ${d.material===m?"selected":""}>${m}</option>`).join("")}</select></div><div class="fg"><label class="fl">Украшение</label><select class="fse" id="dDec" onchange="queueDressAutosave()">${DECS.map(x=>`<option ${d.decoration===x?"selected":""}>${x}</option>`).join("")}</select></div><div class="fg"><label class="fl">Стиль</label><select class="fse" id="dStyle" onchange="queueDressAutosave()">${STYS.map(s=>`<option ${d.style===s?"selected":""}>${s}</option>`).join("")}</select></div></div>
    <div class="fgrid"><div class="fg"><label class="fl">Цена/сут *</label><input class="fi" type="number" id="dPrice" value="${d.price||""}" oninput="queueDressAutosave()"></div><div class="fg"><label class="fl">Залог</label><input class="fi" type="number" id="dDep" value="${d.deposit||""}" oninput="queueDressAutosave()"></div></div>
    <div class="fg"><label class="fl">Описание</label><textarea class="fta" id="dDesc" rows="3" oninput="queueDressAutosave()">${esc(d.description||"")}</textarea></div>
    <div class="fg"><label class="fl">Фото (до 8)</label><div class="pgrid" id="phGrid"></div><input type="file" id="phInp" accept="image/*" multiple style="display:none" onchange="hPh(event)"></div>
    <div id="dressSaveHint" style="font-size:12px;color:var(--g500);margin-top:6px">${editDress?"Изменения сохраняются автоматически":"Черновик сохранится автоматически"}</div>
    <div class="fbtns"><button class="bcn" onclick="closeModal()">Отмена</button><button class="bsb" onclick="subDress()">${editDress?"Сохранить":"Добавить"}</button></div>`;
  rPhGrid();
}
function rPhGrid(){const g=document.getElementById("phGrid");if(!g)return;g.innerHTML=formPhotos.map((p,i)=>`<div class="pth"><img src="${escAttr(p)}"><button class="prm" onclick="formPhotos.splice(${i},1);queueDressAutosave();rPhGrid()">✕</button></div>`).join("")+`<button class="padd" onclick="document.getElementById('phInp').click()">📷<span>Фото</span></button>`}
async function hPh(e){for(const f of[...e.target.files]){if(formPhotos.length>=8)break;formPhotos.push(await compImg(f))}rPhGrid();queueDressAutosave();e.target.value=""}

// 🔥 FIREBASE: Сохранение платья
async function subDress(){
  const wasEditing=Boolean(editDress);
  const saved=await persistDressDraft(true);
  if(!saved)return;
  showToast(wasEditing?"Обновлён!":"Добавлен!");
  closeModal();
}

// ── DETAIL MODAL ──
function openDetM(id){const d=gD(id);if(!d)return;detPhIdx=0;document.getElementById("moTitle").textContent=d.name;document.getElementById("moBox").classList.add("wide");document.getElementById("mov").style.display="flex";rDetBody(d)}
function rDetBody(d){
  const s=gDS(d.id),cfg=ST[s],ar=gAR(d.id),al=getAlert(d.id),hist=rentals.filter(r=>r.dressId===d.id);
  const ph=d.photos?.length?`<img src="${d.photos[detPhIdx]}" style="width:100%;height:100%;object-fit:cover">${d.photos.length>1?`<button class="dpnav pv" onclick="detPhIdx=(detPhIdx-1+gD('${d.id}').photos.length)%gD('${d.id}').photos.length;rDetBody(gD('${d.id}'))">◀</button><button class="dpnav nx" onclick="detPhIdx=(detPhIdx+1)%gD('${d.id}').photos.length;rDetBody(gD('${d.id}'))">▶</button>`:""}`:`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--g300);font-size:50px">⛸️</div>`;
  let alH="";if(al==="overdue")alH=`<div class="abanner dng" style="margin-bottom:12px"><div class="ab-ico">🚨</div><div class="ab-body"><div class="ab-t">Просрочен!</div><div class="ab-d">${ar?ar.clientName+": до "+fmtD(ar.endDate):""}</div></div></div>`;
  else if(al==="expiring")alH=`<div class="abanner wrn" style="margin-bottom:12px"><div class="ab-ico">⚠️</div><div class="ab-body"><div class="ab-t">Скоро возврат!</div><div class="ab-d">${ar?ar.clientName+": "+fmtD(ar.endDate):""}</div></div></div>`;
  document.getElementById("moBody").innerHTML=`<div class="detg"><div><div class="dpm">${ph}</div></div><div>${alH}<div class="sbadge ${cfg.c}" style="display:inline-flex;margin-bottom:10px"><div class="sdot"></div>${cfg.l}</div><div style="margin-bottom:8px">${stars(d.rating)}</div><div class="det-ig"><div class="det-ic"><div class="det-il">Категория</div><div class="det-iv">${d.category}</div></div><div class="det-ic"><div class="det-il">Размер</div><div class="det-iv">${d.size}</div></div><div class="det-ic"><div class="det-il">Материал</div><div class="det-iv">${d.material}</div></div><div class="det-ic"><div class="det-il">Стиль</div><div class="det-iv">${d.style}</div></div></div><div class="det-pb"><div class="det-pi"><label>Цена/сут</label><div class="v">${fmt(d.price)}</div></div><div class="det-pi" style="text-align:right"><label>Залог</label><div class="v">${fmt(d.deposit)}</div></div></div>${d.description?`<div class="det-desc">${d.description}</div>`:""}${ar?`<div style="background:var(--g50);border-radius:12px;padding:10px 14px;margin-bottom:12px"><div style="font-size:11px;color:var(--g400)">Клиент</div><div style="font-weight:700">${ar.clientName} ${ar.clientPhone||""}</div><div style="font-size:11px;color:var(--g500)">${fmtD(ar.startDate)} - ${fmtD(ar.endDate)}</div></div>`:""}<div class="det-btns"><button class="det-eb" onclick="closeModal();setTimeout(()=>openDressM('${d.id}'),100)">Редактировать</button><button class="det-rb" onclick="closeModal();setTimeout(()=>openRenM(null,'${d.id}'),100)">Сдать</button></div>${hist.length?`<div class="hist"><div class="hist-t">История</div>${hist.map(r=>`<div class="hi"><div><div class="hi-n">${r.clientName}</div><div class="hi-d">${fmtD(r.startDate)} - ${fmtD(r.endDate)}</div></div><div class="hi-p">${fmt(r.totalPrice)}</div></div>`).join("")}</div>`:""}</div></div>`;
}

// ── RENTAL MODAL ──
function openRenM(rid,did){
  editRental=rid?rentals.find(r=>r.id===rid):null;formStatus=editRental?editRental.status:"booked";
  document.getElementById("moTitle").textContent=editRental?"Редактировать":"Новый прокат";
  document.getElementById("moBox").classList.remove("wide");document.getElementById("mov").style.display="flex";
  const r=editRental||{},sd=did||r.dressId||"",startDate=r.startDate||today(),endDate=r.endDate||addD(3),suggestedTotal=calcSuggestedTotal(sd,startDate,endDate),totalValue=editRental?toNum(r.totalPrice,suggestedTotal):suggestedTotal;
  document.getElementById("moBody").innerHTML=`
    <div class="fg"><label class="fl">Костюм *</label><select class="fse" id="rDress" onchange="uRP();checkOvl()"><option value="">--</option>${dresses.map(d=>`<option value="${d.id}" ${d.id===sd?"selected":""}>${d.name} (${d.size})</option>`).join("")}</select></div>
    <div class="fg"><label class="fl">Клиент *</label><input class="fi" id="rClient" value="${escAttr(r.clientName||"")}"></div>
    <div class="fg"><label class="fl">Телефон</label><input class="fi" id="rPhone" value="${escAttr(r.clientPhone||"")}"></div>
    <div class="fgrid"><div class="fg"><label class="fl">Начало *</label><input class="fi" type="date" id="rStart" value="${r.startDate||today()}" onchange="uRP();checkOvl()"></div><div class="fg"><label class="fl">Возврат *</label><input class="fi" type="date" id="rEnd" value="${r.endDate||addD(3)}" onchange="uRP();checkOvl()"></div></div>
    <div id="ovlWarn"></div>
    <div class="fg"><label class="fl">Статус</label><div class="spills" id="rSP"></div></div>
    <div class="pp" id="renPP"></div>
    <div class="fgrid">
      <div class="fg"><label class="fl">РС‚РѕРіРѕРІР°СЏ СЃСѓРјРјР° *</label><input class="fi" type="number" min="0" step="1" id="rTotal" value="${totalValue}" data-manual="${editRental?"1":"0"}" oninput="markTotalManual('rTotal')"></div>
      <div class="fg" style="display:flex;align-items:flex-end"><button class="spill" type="button" style="width:100%" onclick="applySuggestedTotal('rTotal')">РџРѕРґСЃС‚Р°РІРёС‚СЊ СЂР°СЃС‡С‘С‚</button></div>
    </div>
    <div class="fg"><label class="fl">Заметки</label><textarea class="fta" id="rNotes" rows="2">${esc(r.notes||"")}</textarea></div>
    <div class="fbtns"><button class="bcn" onclick="closeModal()">Отмена</button><button class="bsb" id="renSubBtn" onclick="subRen()">${editRental?"Сохранить":"Создать"}</button></div>`;
  const rTotalInput=document.getElementById("rTotal");
  if(rTotalInput){
    const label=rTotalInput.closest(".fg")?.querySelector(".fl");
    if(label)label.textContent="\u0418\u0442\u043e\u0433\u043e\u0432\u0430\u044f \u0441\u0443\u043c\u043c\u0430 *";
    const btn=rTotalInput.closest(".fgrid")?.querySelector("button");
    if(btn)btn.textContent="\u041f\u043e\u0434\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u0440\u0430\u0441\u0447\u0435\u0442";
  }
  rSP2();uRP();checkOvl();
}
function rSP2(){const el=document.getElementById("rSP");if(!el)return;el.innerHTML=["booked","rented","returned"].map(s=>`<button class="spill ${formStatus===s?"act":""}" onclick="formStatus='${s}';rSP2()">${ST[s].l}</button>`).join("")}
function uRP(){const did=document.getElementById("rDress").value,d=gD(did),el=document.getElementById("renPP");if(!d||!el){if(el)el.innerHTML=`<div class="ppl">Выберите</div><div class="ppv">--</div>`;return}const n=daysN(document.getElementById("rStart").value,document.getElementById("rEnd").value);if(n<1){el.innerHTML=`<div class="ppl">Проверьте даты</div><div class="ppv">--</div>`;return}el.innerHTML=`<div class="ppl">${n} сут x ${fmt(d.price)}</div><div class="ppv">${fmt(n*d.price)}</div>`}
function uRP(){const did=document.getElementById("rDress").value,d=gD(did),el=document.getElementById("renPP"),s=document.getElementById("rStart").value,e=document.getElementById("rEnd").value;if(!d||!el){if(el)el.innerHTML=`<div class="ppl">Р’С‹Р±РµСЂРёС‚Рµ</div><div class="ppv">--</div>`;syncTotalInput("rTotal",0);return}const n=daysN(s,e);if(n<1){el.innerHTML=`<div class="ppl">РџСЂРѕРІРµСЂСЊС‚Рµ РґР°С‚С‹</div><div class="ppv">--</div>`;syncTotalInput("rTotal",0);return}const suggested=calcSuggestedTotal(did,s,e);el.innerHTML=`<div class="ppl">${n} СЃСѓС‚ x ${fmt(d.price)}</div><div class="ppv">${fmt(suggested)}</div>`;syncTotalInput("rTotal",suggested)}
function uRP(){const did=document.getElementById("rDress").value,d=gD(did),el=document.getElementById("renPP"),s=document.getElementById("rStart").value,e=document.getElementById("rEnd").value;if(!d||!el){if(el)el.innerHTML=`<div class="ppl">Выберите</div><div class="ppv">--</div>`;syncTotalInput("rTotal",0);return}const n=daysN(s,e);if(n<1){el.innerHTML=`<div class="ppl">Проверьте даты</div><div class="ppv">--</div>`;syncTotalInput("rTotal",0);return}const suggested=calcSuggestedTotal(did,s,e);el.innerHTML=`<div class="ppl">${n} сут x ${fmt(d.price)}</div><div class="ppv">${fmt(suggested)}</div>`;syncTotalInput("rTotal",suggested)}
function checkOvl(){
  const did=document.getElementById("rDress").value,s=document.getElementById("rStart").value,e=document.getElementById("rEnd").value;
  const warn=document.getElementById("ovlWarn"),btn=document.getElementById("renSubBtn");
  if(!did||!s||!e){if(warn)warn.innerHTML="";return}
  if(!isValidDateRange(s,e)){warn.innerHTML=`<div class="overlap-warn">⚠️ <strong>Дата возврата должна быть позже или равна дате выдачи.</strong></div>`;btn.disabled=true;btn.style.opacity=".5";return}
  const conflicts=checkOverlap(did,s,e,editRental?editRental.id:null);
  if(conflicts.length){warn.innerHTML=`<div class="overlap-warn">⚠️ <strong>Даты заняты!</strong><br>${conflicts.map(c=>`${c.clientName}: ${fmtD(c.startDate)} - ${fmtD(c.endDate)} (${ST[c.status].l})`).join("<br>")}</div>`;btn.disabled=true;btn.style.opacity=".5"}else{warn.innerHTML="";btn.disabled=false;btn.style.opacity="1"}
}

// 🔥 FIREBASE: Сохранение проката
async function subRen(){
  const did=document.getElementById("rDress").value,cl=safeLine(document.getElementById("rClient").value);
  if(!did){showToast("Выберите костюм!","error");return}if(!cl){showToast("Имя!","error");return}
  const s=document.getElementById("rStart").value,e=document.getElementById("rEnd").value,d=gD(did);
  if(!isValidDateRange(s,e)){showToast("Проверьте даты!","error");return}
  if(checkOverlap(did,s,e,editRental?editRental.id:null).length){showToast("Даты заняты другим клиентом!","error");return}
  const tot=readTotalInput("rTotal");
  const obj={dressId:did,clientName:cl,clientPhone:safePhone(document.getElementById("rPhone").value),startDate:s,endDate:e,status:formStatus,notes:safeMultiline(document.getElementById("rNotes").value),totalPrice:tot};
  if(editRental){
    const saved=await fbSaveRental({...editRental,...obj});
    upsertLocalRental(saved);
    showToast("Обновлён!");
  }else{
    const saved=await fbSaveRental({id:gid(),...obj});
    upsertLocalRental(saved);
    if(d){
      const updatedDress=normalizeDress(d.id,{...d,rentCount:(d.rentCount||0)+1});
      upsertLocalDress(updatedDress);
      await fbSaveDress(updatedDress);
    }
    showToast("Создан!");
  }
  closeModal();renderAll();
}

// ── RENTALS TAB ──
function renderRen(){
  document.getElementById("renFils").innerHTML=["all","booked","rented","returned"].map(f=>`<button class="fp2 ${renFil===f?"active":""}" onclick="renFil='${f}';renderRen()">${f==="all"?"Все":ST[f].l}</button>`).join("");
  const q=document.getElementById("renSearch").value.toLowerCase();
  let list=rentals.filter(r=>{if(renFil!=="all"&&r.status!==renFil)return false;if(q){const d=gD(r.dressId);if(!r.clientName.toLowerCase().includes(q)&&!(d&&d.name.toLowerCase().includes(q))&&!(r.clientPhone||"").includes(q))return false}return true}).sort((a,b)=>new Date(b.startDate)-new Date(a.startDate));
  const el=document.getElementById("renList");
  if(!list.length){el.innerHTML=`<div class="empty"><div class="empty-ico">📋</div><h3>Нет прокатов</h3></div>`;return}
  el.innerHTML=list.map(r=>{
    const d=gD(r.dressId),cfg=ST[r.status],ph=d?.photos?.length?`<img src="${d.photos[0]}">`:"⛸️";
    let alC="",alT="";
    if(r.status==="rented"){const diff=diffD(today(),r.endDate);if(diff<0){alC="overdue";alT=`<span class="ov-tag">ПРОСРОЧЕН ${Math.abs(diff)} дн!</span>`}else if(diff<=1){alC="expiring";alT=`<span class="ex-tag">${diff===0?"Сегодня!":"Завтра"}</span>`}}
    return`<div class="rc2 ${alC}"><div class="rc2-ph">${ph}</div><div class="rc2-b"><div class="rc2-top"><div><div class="rc2-dn">${d?d.name:"?"}</div><div class="rc2-cl">${r.clientName}</div><div class="rc2-ph2">${r.clientPhone||""}</div></div><div class="rac"><button class="rab" onclick="openRenM('${r.id}',null)">✏️</button><button class="rab" onclick="delRen('${r.id}')">🗑️</button></div></div><div class="rc2-meta"><div class="sbadge ${cfg.c}" style="font-size:10px;padding:4px 10px"><div class="sdot"></div>${cfg.l}</div>${alT}<div class="rc2-dates">${fmtD(r.startDate)} - ${fmtD(r.endDate)}</div>${r.status==="booked"?`<button class="rbtn" style="padding:4px 10px;font-size:10px" onclick="chRS('${r.id}','rented')">Выдать</button>`:""}${r.status==="rented"?`<button class="rbtn" style="padding:4px 10px;font-size:10px;background:linear-gradient(135deg,#3b82f6,#2563eb)" onclick="chRS('${r.id}','returned')">Вернуть</button>`:""}<div class="rc2-pr">${fmt(r.totalPrice)}</div></div></div></div>`;
  }).join("");
}

// 🔥 FIREBASE: Смена статуса проката
function chRS(id,st){
  const r=rentals.find(x=>x.id===id);
  if(r){r.status=st;fbSaveRental(r);renderAll();showToast(ST[st].l)}
}

// 🔥 FIREBASE: Удаление проката
function delRen(id){
  if(!confirm("Удалить?"))return;
  rentals=rentals.filter(r=>r.id!==id);
  fbDeleteRental(id);
  renderAll();showToast("Удалён","info");
}

// ── CALENDAR ──
function renderCal2(){
  document.getElementById("calTitle").textContent=MO[calM]+" "+calY;
  document.getElementById("calHdr").innerHTML=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(d=>`<div class="cdn">${d}</div>`).join("");
  const first=new Date(calY,calM,1),last=new Date(calY,calM+1,0);
  let sd=first.getDay();sd=sd===0?6:sd-1;const td2=today();let html="";
  for(let i=0;i<sd;i++)html+=`<div class="cc emp"></div>`;
  for(let d=1;d<=last.getDate();d++){
    const ds=`${calY}-${String(calM+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const evts=rentals.filter(r=>ds>=r.startDate&&ds<=r.endDate);
    const dots=evts.slice(0,3).map(r=>`<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${ST[r.status]?.d||"#ccc"}"></span>`).join("");
    html+=`<div class="cc ${ds===td2?"td":""} ${ds===calSel?"sel":""}" onclick="calSel='${ds}';renderCal2()"><div class="cdn2">${d}</div><div style="display:flex;gap:2px;flex-wrap:wrap">${dots}${evts.length>3?`<span style="font-size:9px;color:var(--g500)">+${evts.length-3}</span>`:""}</div></div>`;
  }
  document.getElementById("calGrid").innerHTML=html;
  const det=document.getElementById("calDet");
  if(!calSel){det.innerHTML="";return}
  const evts=rentals.filter(r=>calSel>=r.startDate&&calSel<=r.endDate);
  if(!evts.length){det.innerHTML=`<div class="cdet"><strong>${fmtD(calSel)}</strong> — нет прокатов</div>`;return}
  det.innerHTML=`<div class="cdet"><strong>${fmtD(calSel)}</strong> — ${evts.length} пр.${evts.map(r=>{const d=gD(r.dressId);return`<div style="display:flex;justify-content:space-between;padding:8px;background:var(--g50);border-radius:10px;margin-top:6px"><div><strong>${d?d.name:"?"}</strong><br><span style="font-size:11px;color:var(--g500)">${r.clientName} · ${fmtD(r.startDate)}-${fmtD(r.endDate)}</span></div><div style="text-align:right"><div class="sbadge ${ST[r.status].c}" style="font-size:9px;padding:3px 8px"><div class="sdot"></div>${ST[r.status].l}</div><div style="font-weight:800;margin-top:4px">${fmt(r.totalPrice)}</div></div></div>`}).join("")}</div>`;
}
function calPrev(){calM--;if(calM<0){calM=11;calY--}renderCal2()}
function calNext(){calM++;if(calM>11){calM=0;calY++}renderCal2()}

// ── CLIENT CATALOG ──
function getClFiltered(){
  const q=document.getElementById("clSearch").value.toLowerCase(),sz=document.getElementById("clSizeF").value,cat=document.getElementById("clCatF").value;
  return dresses.filter(d=>{if(q&&!d.name.toLowerCase().includes(q)&&!(d.description||"").toLowerCase().includes(q))return false;if(sz&&d.size!==sz)return false;if(cat&&d.category!==cat)return false;return true}).sort((a,b)=>({available:0,booked:1,rented:2,returned:3}[gDS(a.id)])-({available:0,booked:1,rented:2,returned:3}[gDS(b.id)]));
}
function renderCl(){
  const list=getClFiltered(),g=document.getElementById("clGrid");
  if(!list.length){g.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="empty-ico">🔍</div><h3>Не найдено</h3></div>`;return}
  g.innerHTML=list.map(d=>{
    const s=gDS(d.id),cfg=ST[s],ar=gAR(d.id),isAv=s==="available";
    const ph=d.photos?.length?`<img src="${d.photos[0]}">`:`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--g300);font-size:48px">⛸️</div>`;
    let bot="";
    if(isAv)bot=`<button class="cl-book" onclick="event.stopPropagation();openBookM('${d.id}')">Забронировать</button>`;
    else if(s==="booked")bot=`<div class="cl-unavail bk">до ${ar?fmtD(ar.endDate):"..."}</div>`;
    else if(s==="rented")bot=`<div class="cl-unavail rn">до ${ar?fmtD(ar.endDate):"..."}</div>`;
    else bot=`<button class="cl-book" onclick="event.stopPropagation();openBookM('${d.id}')">Записаться</button>`;
    const bookings=getDressBookings(d.id);
    const bookHtml=bookings.length?`<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--g100)">${bookings.map(b=>`<div style="font-size:10px;color:${b.status==='rented'?'#ef4444':'#f59e0b'};margin-bottom:2px">${ST[b.status].i} ${fmtDs(b.start)}-${fmtDs(b.end)}</div>`).join("")}</div>`:"";
    return`<div class="clc" onclick="openBookM('${d.id}')"><div class="cl-photo">${ph}<div class="cl-rib ${cfg.rc}">${cfg.i} ${cfg.l}</div></div><div class="cl-body"><div class="cl-name">${d.name}</div><div class="cl-cat">${d.category} · ${d.style}</div><div class="cl-desc">${d.description||""}</div><div class="cl-props"><div class="cl-prop">${d.size}</div><div class="cl-prop">${d.material}</div><div class="cl-prop">${d.decoration}</div></div><div class="cl-prow"><div><div class="cl-price">${fmt(d.price)}<span> /сут</span></div><div class="cl-dep">Залог ${fmt(d.deposit)}</div></div>${bot}</div>${bookHtml}</div></div>`;
  }).join("");
}

// ── BOOK MODAL ──
function openBookM(id){
  const d=gD(id);if(!d)return;
  document.getElementById("moTitle").textContent="Заявка";document.getElementById("moBox").classList.remove("wide");document.getElementById("mov").style.display="flex";
  const ph=d.photos?.length?`<img src="${d.photos[0]}" style="width:100%;height:100%;object-fit:cover">`:`<div class="np">⛸️</div>`;
  const bookings=getDressBookings(d.id);
  const bkHtml=bookings.length?`<div style="background:var(--g50);border-radius:10px;padding:10px;margin-bottom:14px"><div style="font-size:11px;font-weight:700;margin-bottom:6px">Занятые даты:</div>${bookings.map(b=>`<div style="font-size:11px;color:${b.status==='rented'?'#ef4444':'#f59e0b'};margin-bottom:2px">${ST[b.status].i} ${fmtD(b.start)} - ${fmtD(b.end)} (${b.client})</div>`).join("")}</div>`:"";
  document.getElementById("moBody").innerHTML=`
    <div class="bmd"><div class="bmp">${ph}</div><div><div class="bmd-n">${d.name}</div><div class="bmd-p">${d.category} · ${d.size}</div><div class="bmd-p" style="font-weight:700;color:var(--g800);margin-top:4px">${fmt(d.price)}/сут · Залог ${fmt(d.deposit)}</div></div></div>
    ${bkHtml}
    <div class="fg"><label class="fl">Имя *</label><input class="fi" id="bN"></div>
    <div class="fg"><label class="fl">Телефон *</label><input class="fi" id="bPh"></div>
    <div class="fgrid"><div class="fg"><label class="fl">Получение</label><input class="fi" type="date" id="bS" value="${today()}" onchange="uBP('${d.id}');checkBookOvl('${d.id}')"></div><div class="fg"><label class="fl">Возврат</label><input class="fi" type="date" id="bE" value="${addD(3)}" onchange="uBP('${d.id}');checkBookOvl('${d.id}')"></div></div>
    <div id="bookOvlWarn"></div>
    <div class="pp" id="bookPP"></div>
    <div class="fgrid">
      <div class="fg"><label class="fl">РС‚РѕРіРѕРІР°СЏ СЃСѓРјРјР° *</label><input class="fi" type="number" min="0" step="1" id="bTotal" value="" data-manual="0" oninput="markTotalManual('bTotal')"></div>
      <div class="fg" style="display:flex;align-items:flex-end"><button class="spill" type="button" style="width:100%" onclick="applySuggestedTotal('bTotal')">РџРѕРґСЃС‚Р°РІРёС‚СЊ СЂР°СЃС‡С‘С‚</button></div>
    </div>
    <div class="fg"><label class="fl">Примечание</label><textarea class="fta" id="bNotes" rows="2"></textarea></div>
    <div class="fbtns"><button class="bcn" onclick="closeModal()">Отмена</button><button class="bsb" id="bookSubBtn" onclick="subBook('${d.id}')">Забронировать</button></div>`;
  const bTotalInput=document.getElementById("bTotal");
  if(bTotalInput){
    const label=bTotalInput.closest(".fg")?.querySelector(".fl");
    if(label)label.textContent="\u0418\u0442\u043e\u0433\u043e\u0432\u0430\u044f \u0441\u0443\u043c\u043c\u0430 *";
    const btn=bTotalInput.closest(".fgrid")?.querySelector("button");
    if(btn)btn.textContent="\u041f\u043e\u0434\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u0440\u0430\u0441\u0447\u0435\u0442";
  }
  uBP(d.id);checkBookOvl(d.id);
}
function uBP(id){const d=gD(id),el=document.getElementById("bookPP");if(!d||!el)return;const n=daysN(document.getElementById("bS").value,document.getElementById("bE").value);if(n<1){el.innerHTML=`<div class="ppl">Проверьте даты</div><div class="ppv">--</div>`;return}el.innerHTML=`<div class="ppl">${n} сут x ${fmt(d.price)}</div><div class="ppv">${fmt(n*d.price)}</div>`}
function uBP(id){const d=gD(id),el=document.getElementById("bookPP"),s=document.getElementById("bS").value,e=document.getElementById("bE").value;if(!d||!el)return;const n=daysN(s,e);if(n<1){el.innerHTML=`<div class="ppl">РџСЂРѕРІРµСЂСЊС‚Рµ РґР°С‚С‹</div><div class="ppv">--</div>`;syncTotalInput("bTotal",0);return}const suggested=calcSuggestedTotal(id,s,e);el.innerHTML=`<div class="ppl">${n} СЃСѓС‚ x ${fmt(d.price)}</div><div class="ppv">${fmt(suggested)}</div>`;syncTotalInput("bTotal",suggested)}
function uBP(id){const d=gD(id),el=document.getElementById("bookPP"),s=document.getElementById("bS").value,e=document.getElementById("bE").value;if(!d||!el)return;const n=daysN(s,e);if(n<1){el.innerHTML=`<div class="ppl">Проверьте даты</div><div class="ppv">--</div>`;syncTotalInput("bTotal",0);return}const suggested=calcSuggestedTotal(id,s,e);el.innerHTML=`<div class="ppl">${n} сут x ${fmt(d.price)}</div><div class="ppv">${fmt(suggested)}</div>`;syncTotalInput("bTotal",suggested)}
function checkBookOvl(dressId){
  const s=document.getElementById("bS").value,e=document.getElementById("bE").value;
  const warn=document.getElementById("bookOvlWarn"),btn=document.getElementById("bookSubBtn");
  if(!s||!e){if(warn)warn.innerHTML="";return}
  if(!isValidDateRange(s,e)){warn.innerHTML=`<div class="overlap-warn">⚠️ <strong>Дата возврата должна быть позже или равна дате получения.</strong></div>`;btn.disabled=true;btn.style.opacity=".5";return}
  const conflicts=checkOverlap(dressId,s,e,null);
  if(conflicts.length){warn.innerHTML=`<div class="overlap-warn">⚠️ <strong>Эти даты уже заняты!</strong><br>${conflicts.map(c=>`${c.clientName}: ${fmtD(c.startDate)} - ${fmtD(c.endDate)}`).join("<br>")}<br>Выберите другие даты.</div>`;btn.disabled=true;btn.style.opacity=".5"}else{warn.innerHTML="";btn.disabled=false;btn.style.opacity="1"}
}

// 🔥 FIREBASE: Создание брони из каталога клиента
async function subBook(id){
  const d=gD(id);if(!d)return;const nm=safeLine(document.getElementById("bN").value),ph=safePhone(document.getElementById("bPh").value);
  if(!nm){showToast("Имя!","error");return}if(!ph){showToast("Телефон!","error");return}
  const s=document.getElementById("bS").value,e=document.getElementById("bE").value;
  if(!isValidDateRange(s,e)){showToast("Проверьте даты!","error");return}
  if(checkOverlap(id,s,e,null).length){showToast("Даты заняты!","error");return}
  const tot=readTotalInput("bTotal");
  const newRental=await fbSaveRental({id:gid(),dressId:id,clientName:nm,clientPhone:ph,startDate:s,endDate:e,status:"booked",notes:safeMultiline(document.getElementById("bNotes").value),totalPrice:tot});
  upsertLocalRental(newRental);
  const updatedDress=normalizeDress(d.id,{...d,rentCount:(d.rentCount||0)+1});
  upsertLocalDress(updatedDress);
  await fbSaveDress(updatedDress);
  document.getElementById("moBody").innerHTML=`<div class="bsuc"><div class="bsuc-i">🎉</div><h3>Забронировано!</h3><p><strong>${d.name}</strong><br>${fmtD(s)} - ${fmtD(e)}<br>Итого: <strong>${fmt(tot)}</strong></p><button class="bsb" style="margin-top:16px;max-width:200px" onclick="closeModal()">OK</button></div>`;
  renderAll();
}

// ── PDF (без изменений) ──
async function exportPDF(){
  const btn=document.getElementById("pdfBtn");btn.disabled=true;
  document.getElementById("pdfOvl").style.display="flex";
  const pb=document.getElementById("pdfPb"),msg=document.getElementById("pdfMsg"),pt=document.getElementById("pdfPt");
  try{
    if(!fontOK){msg.textContent="Загрузка шрифтов...";await loadFont();let w=0;while(!fontOK&&w<30){await new Promise(r=>setTimeout(r,200));w++}}
    const{jsPDF}=window.jspdf;
    const doc=new jsPDF("p","mm","a4");
    const PW=210,PH=297,MG=14,CW=PW-2*MG;
    let cyOK=false;
    if(fontOK&&robotoB64){try{doc.addFileToVFS("Roboto.ttf",robotoB64);doc.addFont("Roboto.ttf","Roboto","normal");doc.setFont("Roboto","normal");doc.setFontSize(10);doc.text("test",0,0);cyOK=true;doc.addPage();doc.deletePage(1)}catch(e){doc.addPage();doc.deletePage(1)}}
    const sf=s=>{if(cyOK)doc.setFont("Roboto","normal");else doc.setFont("helvetica","normal");doc.setFontSize(s)};
    const sfb=s=>{if(cyOK)doc.setFont("Roboto","normal");else doc.setFont("helvetica","bold");doc.setFontSize(s)};
    const h2r=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
    const list=getClFiltered();const total=list.length;
    if(!total){document.getElementById("pdfOvl").style.display="none";btn.disabled=false;showToast("Нет костюмов","warn");return}
    const avail=list.filter(d=>gDS(d.id)==="available").length;
    const catF=document.getElementById("clCatF").value,sizeF=document.getElementById("clSizeF").value;
    const filterLabel=(catF||sizeF)?`Фильтр: ${catF||"все"} / ${sizeF||"все размеры"}`:"Все костюмы";
    msg.textContent="Загрузка фото...";
    const imgDims={};
    for(const d of list){if(d.photos&&d.photos.length){const pics=d.photos.slice(0,3);imgDims[d.id]=[];for(const p of pics){imgDims[d.id].push(await getImgDims(p))}}}
    const stC={available:{l:"СВОБОДНО",bg:"#dcfce7",fg:"#166534",bar:"#22c55e"},booked:{l:"ЗАБРОНИРОВАНО",bg:"#fef9c3",fg:"#854d0e",bar:"#eab308"},rented:{l:"В ПРОКАТЕ",bg:"#fecaca",fg:"#991b1b",bar:"#ef4444"},returned:{l:"ВОЗВРАЩЕНО",bg:"#dbeafe",fg:"#1e40af",bar:"#3b82f6"}};
    const HDRH=32,CARDH=58,GAP=4;
    const cpp=Math.floor((PH-HDRH-MG)/(CARDH+GAP));
    const tPages=Math.ceil(total/cpp)+1;
    function drawHdr(pn){
      doc.setFillColor(14,165,233);doc.rect(0,0,PW,24,"F");
      doc.setFillColor(99,102,241);doc.rect(PW*0.55,0,PW*0.45,24,"F");
      doc.setTextColor(255,255,255);sfb(15);doc.text("ФИГУРАПРОКАТ",MG,10);
      sf(8);doc.text("Каталог костюмов | "+filterLabel,MG,16);
      doc.text(new Date().toLocaleDateString("ru-RU")+" | "+pn+"/"+tPages,PW-MG,16,{align:"right"});
      doc.setFillColor(248,250,252);doc.rect(0,24,PW,7,"F");
      let lx=MG;
      [["#22c55e","Свободно"],["#eab308","Забронировано"],["#ef4444","В прокате"]].forEach(([c,l])=>{const[r,g,b]=h2r(c);doc.setFillColor(r,g,b);doc.circle(lx+2,27.5,1.5,"F");doc.setTextColor(100,116,139);sf(7);doc.text(l,lx+5,28.5);lx+=42});
    }
    function drawCard(d,x,y){
      const st2=gDS(d.id),sc=stC[st2];const[cr,cg,cb]=h2r(sc.bar);const w=CW,h=CARDH;
      doc.setFillColor(235,235,235);doc.roundedRect(x+.5,y+.5,w,h,3,3,"F");
      doc.setFillColor(255,255,255);doc.roundedRect(x,y,w,h,3,3,"F");
      doc.setDrawColor(226,232,240);doc.setLineWidth(.2);doc.roundedRect(x,y,w,h,3,3,"S");
      doc.setFillColor(cr,cg,cb);doc.rect(x,y+2,2.5,h-4,"F");
      const photos=(d.photos||[]).slice(0,3);const dims=imgDims[d.id]||[];
      const phCount=photos.length;const phAreaW=phCount>0?Math.min(phCount*30+(phCount-1)*2,92):0;
      const phH=h-8,phTop=y+4;let phX=x+5;
      if(phCount>0){const singleW=Math.floor((phAreaW-(phCount-1)*2)/phCount);
        for(let pi=0;pi<phCount;pi++){const bx=phX,by=phTop,bw=singleW,bh=phH;
          doc.setFillColor(240,249,255);doc.roundedRect(bx,by,bw,bh,2,2,"F");
          if(dims[pi]){const fit=fitInBox(dims[pi].w,dims[pi].h,bw-2,bh-2);try{doc.addImage(photos[pi],"JPEG",bx+1+fit.x,by+1+fit.y,fit.w,fit.h,undefined,"FAST")}catch(e){}}
          phX+=singleW+2;
        }
      }
      const tx=x+5+(phAreaW>0?phAreaW+5:0),tw=w-10-(phAreaW>0?phAreaW+5:0);let ty=y+7;
      const[sr,sg,sb]=h2r(sc.bg);doc.setFillColor(sr,sg,sb);const bW=Math.min(tw,36);
      doc.roundedRect(tx,ty-3.5,bW,5.5,2,2,"F");
      const[fr,fg,fb]=h2r(sc.fg);doc.setTextColor(fr,fg,fb);sfb(5.5);doc.text(sc.l,tx+2,ty);ty+=6.5;
      doc.setTextColor(30,41,59);sfb(8);const nl=doc.splitTextToSize(d.name,tw);doc.text(nl[0],tx,ty);ty+=4.5;
      doc.setTextColor(14,165,233);sf(6);doc.text(d.category+" | "+d.style,tx,ty);ty+=3.5;
      doc.setTextColor(100,116,139);sf(5.5);doc.text(d.size+" | "+d.material,tx,ty);ty+=3.5;
      if(d.description){doc.setTextColor(148,163,184);sf(5);const dl=doc.splitTextToSize(d.description,tw);doc.text(dl[0],tx,ty);ty+=3.5}
      const bookings=getDressBookings(d.id);
      if(bookings.length){doc.setDrawColor(226,232,240);doc.setLineWidth(.15);doc.line(tx,ty,tx+tw,ty);ty+=2.5;
        bookings.slice(0,2).forEach(bk=>{const bSt2=stC[bk.status];const[br2,bg2,bb2]=h2r(bSt2.bar);doc.setFillColor(br2,bg2,bb2);doc.circle(tx+1.5,ty-0.8,1,"F");doc.setTextColor(80,80,80);sf(5);doc.text(`${fmtDs(bk.start)}-${fmtDs(bk.end)} ${bk.client}`,tx+4,ty);ty+=3});
        if(bookings.length>2){doc.setTextColor(150,150,150);sf(4.5);doc.text("+"+(bookings.length-2)+" ещё",tx+4,ty)}
      }
      const prY=y+h-5;doc.setTextColor(15,23,42);sfb(8);doc.text(fmt(d.price),tx,prY);
      const prW=doc.getTextWidth(fmt(d.price));sf(5.5);doc.setTextColor(148,163,184);doc.text("/сут  Залог: "+fmt(d.deposit),tx+prW+1,prY);
    }
    let ci=0,pn=1;drawHdr(pn);
    for(let i=0;i<total;i++){
      if(ci>0&&ci%cpp===0){doc.addPage();pn++;drawHdr(pn);ci=0}
      drawCard(list[i],MG,HDRH+ci*(CARDH+GAP));ci++;
      pb.style.width=`${Math.round((i/total)*90)}%`;pt.textContent=`${i+1}/${total}`;msg.textContent=list[i].name;
      if(i%3===0)await new Promise(r=>setTimeout(r,0));
    }
    doc.addPage();drawHdr(tPages);
    doc.setFillColor(240,249,255);doc.roundedRect(MG,36,CW,55,5,5,"F");
    doc.setTextColor(12,74,110);sfb(16);doc.text("Как взять костюм?",PW/2,50,{align:"center"});
    doc.setTextColor(51,65,85);sf(10);
    ["1. Выберите костюм из каталога","2. Свяжитесь с нами","3. Внесите залог","4. Наслаждайтесь на льду!"].forEach((s,i)=>doc.text(s,PW/2,60+i*9,{align:"center"}));
    doc.setFillColor(14,165,233);doc.roundedRect(MG,98,CW,22,5,5,"F");
    doc.setTextColor(255,255,255);sfb(13);doc.text("ФИГУРАПРОКАТ",PW/2,109,{align:"center"});
    sf(8);doc.text(total+" костюмов | Свободно: "+avail+" | "+filterLabel,PW/2,117,{align:"center"});
    pb.style.width="100%";msg.textContent="Готово!";await new Promise(r=>setTimeout(r,200));
    const dateStr=new Date().toLocaleDateString("ru-RU").replace(/\./g,"-");
    const fileName="FiguraProkat_"+dateStr+".pdf";
    const blob=doc.output("blob");const file=new File([blob],fileName,{type:"application/pdf"});
    document.getElementById("pdfOvl").style.display="none";
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({title:"ФигураПрокат",text:"Каталог: "+total+" костюмов, свободно: "+avail,files:[file]});showToast("Отправлено!")}
      catch(err){if(err.name!=="AbortError"){doc.save(fileName);showToast("PDF сохранён")}}
    }else{
      doc.save(fileName);
      setTimeout(()=>{document.getElementById("moTitle").textContent="Каталог готов!";document.getElementById("moBox").classList.remove("wide");document.getElementById("mov").style.display="flex";
        const waText=encodeURIComponent("Каталог костюмов ФигураПрокат. "+total+" моделей, свободно: "+avail);
        document.getElementById("moBody").innerHTML=`<div class="bsuc"><div class="bsuc-i">📄</div><h3>PDF сохранён!</h3><p>${fileName}</p><a href="https://wa.me/?text=${waText}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;background:#25D366;color:#fff;border-radius:14px;font-weight:700;text-decoration:none;margin:16px auto;max-width:260px">💬 WhatsApp</a><button onclick="closeModal()" class="bcn" style="max-width:200px;margin:0 auto;display:block">Закрыть</button></div>`;
      },400);
    }
  }catch(e){console.error(e);document.getElementById("pdfOvl").style.display="none";showToast("Ошибка: "+e.message,"error")}
  finally{btn.disabled=false;pb.style.width="0%"}
}

// ── RENDER ALL ──
function renderAll(){renderStats();renderNotifs();renderAlerts();if(curTab==="catalog")renderCat();if(curTab==="calendar")renderCal2();if(curTab==="rentals")renderRen();if(curTab==="client")renderCl()}

// ═══════════════════════════════════════
// 🔥 FIREBASE: ЗАПУСК ПРИЛОЖЕНИЯ
// ═══════════════════════════════════════
async function startApp(){
  console.log("⏳ Загрузка данных из Firebase...");
  try{
    await ensureSeedData();
    await startRealtimeSync();
    initF();
    appReady=true;
    renderAll();
  }catch(e){
    console.error("❌ Firebase start error:",e);
    initF();
    appReady=true;
    renderAll();
    showToast("Ошибка подключения к Firebase","error");
  }
  setTimeout(()=>{
    const ns=getNotifs();
    const ov=ns.filter(n=>n.type==="overdue"),ex=ns.filter(n=>n.type==="expiring");
    if(ov.length)showToast("🚨 Просрочено: "+ov.length,"error");
    if(ex.length)showToast("⚠️ Скоро возврат: "+ex.length,"warn");
  },800);
  setInterval(()=>{renderNotifs();renderAlerts()},60000);
}

// 🔥 Запускаем!
startApp();
