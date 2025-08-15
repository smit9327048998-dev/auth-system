// ------- Demo Products -------
const PRODUCTS = [
  {id:'p1', name:'Wireless Headphones', cat:'electronics', price:1999, img:'https://picsum.photos/seed/p1/600/400'},
  {id:'p2', name:'Smart Watch',        cat:'electronics', price:2499, img:'https://picsum.photos/seed/p2/600/400'},
  {id:'p3', name:'Sneakers',           cat:'fashion',     price:1499, img:'https://picsum.photos/seed/p3/600/400'},
  {id:'p4', name:'Hoodie',             cat:'fashion',     price:999,  img:'https://picsum.photos/seed/p4/600/400'},
  {id:'p5', name:'Blender',            cat:'home',        price:1299, img:'https://picsum.photos/seed/p5/600/400'},
  {id:'p6', name:'Table Lamp',         cat:'home',        price:699,  img:'https://picsum.photos/seed/p6/600/400'},
  {id:'p7', name:'Earbuds',            cat:'electronics', price:899,  img:'https://picsum.photos/seed/p7/600/400'},
  {id:'p8', name:'Backpack',           cat:'fashion',     price:1199, img:'https://picsum.photos/seed/p8/600/400'}
];

// ------- Local Storage State -------
const LS = {
  get(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};
let cart = LS.get('cart', []);       // [{id, qty}]
let saved = LS.get('saved', []);     // [id]
let orders = LS.get('orders', []);   // [{id,date,items,total,address,note}]
let profile = LS.get('profile', { name:'', phone:'', address:'', avatar:'' });

const el = s => document.querySelector(s);
const els = s => Array.from(document.querySelectorAll(s));

const drawer = el('#drawer');
const backdrop = el('#backdrop');
const grid = el('#grid');
const cartPanel = el('#cartPanel');
const ordersPanel = el('#ordersPanel');
const profilePanel = el('#profilePanel');
const supportPanel = el('#supportPanel');
const checkoutPanel = el('#checkoutPanel');
const toastEl = el('#toast');
const cartBadge = el('#cartBadge');

const fmt = n => '₹' + n.toLocaleString('en-IN');

// ------- Drawer / Backdrop -------
el('#menuBtn').addEventListener('click', ()=>{ drawer.classList.add('open'); backdrop.classList.add('show'); });
el('#drawerClose').addEventListener('click', closeAllPanels);
backdrop.addEventListener('click', closeAllPanels);
els('.drawer-link').forEach(b=>{
  b.addEventListener('click', ()=>{
    const t = b.getAttribute('data-open');
    if(t==='profile') openPanel(profilePanel);
    else if(t==='orders'){ renderOrders(); openPanel(ordersPanel); }
    else if(t==='cart'){ renderCart(); openPanel(cartPanel); }
    else if(t==='support') openPanel(supportPanel);
  });
});
el('#logoutBtn').addEventListener('click', ()=>{ window.location.href = '/'; });

function openPanel(panel){
  [cartPanel, ordersPanel, profilePanel, supportPanel, checkoutPanel].forEach(p=>p.classList.remove('open'));
  if(panel) panel.classList.add('open');
  backdrop.classList.add('show');
}
function closeAllPanels(){
  [cartPanel, ordersPanel, profilePanel, supportPanel, checkoutPanel].forEach(p=>p.classList.remove('open'));
  drawer.classList.remove('open');
  backdrop.classList.remove('show');
}
function toast(m){ toastEl.textContent=m; toastEl.classList.add('show'); setTimeout(()=>toastEl.classList.remove('show'),1800); }

// ------- Products -------
function productHTML(p){
  const isSaved = saved.includes(p.id);
  return `
  <div class="card" data-id="${p.id}">
    <div class="card-img"><img src="${p.img}" alt="${p.name}"/></div>
    <div class="card-body">
      <div class="card-title">${p.name}</div>
      <div class="muted">${p.cat}</div>
      <div class="price">${fmt(p.price)}</div>
      <div class="qty">
        <button class="btn" data-act="dec">−</button>
        <input class="qty-input" type="number" min="1" value="1">
        <button class="btn" data-act="inc">+</button>
      </div>
      <div class="card-actions">
        <button class="btn primary" data-act="add">Add to Cart</button>
        <button class="btn save" data-act="save">${isSaved?'Saved':'Save for later'}</button>
      </div>
    </div>
  </div>`;
}
function renderProducts(list=PRODUCTS){ grid.innerHTML = list.map(productHTML).join(''); }
renderProducts();

grid.addEventListener('click', e=>{
  const card = e.target.closest('.card'); if(!card) return;
  const id = card.dataset.id;
  const p = PRODUCTS.find(x=>x.id===id);
  const qtyInput = card.querySelector('.qty-input');

  if(e.target.dataset.act==='inc') qtyInput.value = Math.max(1,(+qtyInput.value||1)+1);
  if(e.target.dataset.act==='dec') qtyInput.value = Math.max(1,(+qtyInput.value||1)-1);

  if(e.target.dataset.act==='add'){
    const qty = Math.max(1,+qtyInput.value||1);
    const f = cart.find(x=>x.id===id);
    if(f) f.qty += qty; else cart.push({id, qty});
    LS.set('cart', cart); updateCartBadge(); toast('Cart me add ho gaya ✅');
  }
  if(e.target.dataset.act==='save'){
    if(saved.includes(id)){ saved = saved.filter(s=>s!==id); e.target.textContent='Save for later'; toast('Saved list se hata diya'); }
    else { saved.push(id); e.target.textContent='Saved'; toast('Save for later me gaya'); }
    LS.set('saved', saved);
  }
});

// search / filter / sort
el('#searchInput').addEventListener('input', e=>{
  const q = e.target.value.toLowerCase();
  renderProducts(PRODUCTS.filter(p=>p.name.toLowerCase().includes(q)));
});
els('.chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    els('.chip').forEach(c=>c.classList.remove('active'));
    chip.classList.add('active');
    const f = chip.dataset.filter;
    renderProducts(f==='all'?PRODUCTS:PRODUCTS.filter(p=>p.cat===f));
  });
});
el('#sortSelect').addEventListener('change', e=>{
  const v = e.target.value; let list=[...PRODUCTS];
  if(v==='low') list.sort((a,b)=>a.price-b.price);
  if(v==='high') list.sort((a,b)=>b.price-a.price);
  renderProducts(list);
});

// ------- Cart -------
el('#cartOpenBtn').addEventListener('click', ()=>{ renderCart(); openPanel(cartPanel); });
function updateCartBadge(){ cartBadge.textContent = cart.reduce((n,x)=>n+x.qty,0); }
function renderCart(){
  const body = el('#cartItems');
  if(!cart.length){ body.innerHTML='<div class="muted">Cart khaali hai.</div>'; el('#cartSubtotal').textContent=fmt(0); return; }
  body.innerHTML = cart.map(item=>{
    const p = PRODUCTS.find(pp=>pp.id===item.id);
    return `
      <div class="cart-row" data-id="${item.id}">
        <img src="${p.img}" alt="${p.name}">
        <div>
          <div style="font-weight:700">${p.name}</div>
          <div class="muted">${fmt(p.price)}</div>
          <div class="qty">
            <button class="btn" data-act="cdec">−</button>
            <span class="muted">Qty: ${item.qty}</span>
            <button class="btn" data-act="cinc">+</button>
          </div>
          <button class="btn outline" data-act="cremove">Remove</button>
        </div>
        <div style="font-weight:800">${fmt(p.price*item.qty)}</div>
      </div>`;
  }).join('');
  el('#cartSubtotal').textContent = fmt(cart.reduce((t,x)=>t + PRODUCTS.find(p=>p.id===x.id).price*x.qty,0));
}
cartPanel.addEventListener('click', e=>{
  const row = e.target.closest('.cart-row'); if(!row) return;
  const id = row.dataset.id;
  const it = cart.find(x=>x.id===id);
  if(e.target.dataset.act==='cinc') it.qty++;
  if(e.target.dataset.act==='cdec') it.qty = Math.max(1,it.qty-1);
  if(e.target.dataset.act==='cremove') cart = cart.filter(x=>x.id!==id);
  LS.set('cart', cart); updateCartBadge(); renderCart();
});

// ------- Checkout / Orders -------
el('#checkoutBtn').addEventListener('click', ()=>{
  el('#checkoutAddress').value = profile.address || '';
  const subtotal = cart.reduce((t,x)=>t + PRODUCTS.find(p=>p.id===x.id).price*x.qty,0);
  el('#checkoutSubtotal').textContent = fmt(subtotal);
  el('#checkoutGrand').textContent = fmt(subtotal);
  openPanel(checkoutPanel);
});
el('#placeOrderBtn').addEventListener('click', ()=>{
  if(!cart.length) return toast('Cart khaali hai');
  const address = el('#checkoutAddress').value.trim();
  if(!address) return toast('Address daal bhai');
  const note = el('#checkoutNote').value.trim();
  const items = cart.map(x=>({...x}));
  const total = cart.reduce((t,x)=>t + PRODUCTS.find(p=>p.id===x.id).price*x.qty,0);
  const order = { id:'ORD'+Date.now(), date:new Date().toLocaleString(), items, total, address, note };
  orders.unshift(order); LS.set('orders', orders);
  cart=[]; LS.set('cart', cart); updateCartBadge(); closeAllPanels(); toast('Order place ho gaya ✅');
});
function renderOrders(){
  const body = el('#ordersBody');
  if(!orders.length){ body.innerHTML='<div class="muted">Abhi tak koi order nahin.</div>'; return; }
  body.innerHTML = orders.map(o=>{
    const count = o.items.reduce((n,x)=>n+x.qty,0);
    const thumb = PRODUCTS.find(p=>p.id===o.items[0].id)?.img;
    return `
      <div class="order-row">
        <img src="${thumb}" alt="">
        <div>
          <div><strong>${o.id}</strong> • ${o.date}</div>
          <div class="muted">${count} item(s)</div>
          <div class="muted">${o.address}</div>
        </div>
        <div style="font-weight:800">${fmt(o.total)}</div>
      </div>`;
  }).join('');
}

// ------- Profile -------
function loadProfileUI(){
  el('#profileName').value = profile.name||'';
  el('#profilePhone').value = profile.phone||'';
  el('#profileAddress').value = profile.address||'';
  el('#avatarPreview').src = profile.avatar || 'https://api.iconify.design/mdi/account-circle.svg?color=%23cbd3e6';
}
el('#saveProfileBtn').addEventListener('click', ()=>{
  profile.name = el('#profileName').value.trim();
  profile.phone = el('#profilePhone').value.trim();
  profile.address = el('#profileAddress').value.trim();
  LS.set('profile', profile); toast('Profile save ho gaya');
});
el('#avatarInput').addEventListener('change', e=>{
  const f = e.target.files?.[0]; if(!f) return;
  const fr = new FileReader();
  fr.onload = ()=>{ profile.avatar = fr.result; LS.set('profile', profile); el('#avatarPreview').src = profile.avatar; toast('Photo updated'); };
  fr.readAsDataURL(f);
});

// ------- Init -------
function init(){ updateCartBadge(); loadProfileUI(); }
init();
