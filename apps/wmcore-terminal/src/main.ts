import { BrowserProvider } from "ethers";
import { LEVERAGE_TIERS, WinmarClient, type Leverage, type Side } from "@winmarchain/sdk";
import "./styles.css";

declare global { interface Window { ethereum?: any } }

type Market = { symbol:string; base:string; quote:string; maxLeverage:number; tickSize:string; lotSize:string; markPrice:string };
type Order = { id:string; market:string; side:Side; type:string; price:string; size:string; leverage:number; status:string };

const API_BASE = (import.meta.env.VITE_WMCORE_API_URL || window.location.origin).replace(/\/$/, "");
const publicClient = new WinmarClient({ baseUrl: API_BASE, environment: "testnet" });

let tradingClient: WinmarClient | null = null;
let walletAddress = "";
let selectedSymbol = "BTC-USD-PERP";
let side: Side = "BUY";
let orderType: "LIMIT" | "MARKET" = "LIMIT";
let leverage: Leverage = 5;
let markets: Market[] = [];

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
<div class="shell">
  <header class="topbar">
    <div class="brand">
      <img src="https://winmarchain.io/logo/wmc.png" alt="WMC" />
      <div><div class="brand-title">WINMAR CHAIN</div><div class="brand-sub">WMCORE FINANCIAL TERMINAL</div></div>
    </div>
    <div class="top-actions">
      <div class="pill"><span class="dot"></span><span id="apiState">API CONNECTING</span></div>
      <div class="pill">TESTNET · NO REAL FUNDS</div>
      <button id="walletBtn" class="wallet">CONNECT WALLET</button>
    </div>
  </header>

  <section class="market-strip">
    <div class="market-main">
      <div id="assetIcon" class="asset-icon">₿</div>
      <div><div id="marketName" class="market-name">BTC-USD-PERP</div><div class="market-meta">Perpetual · WMCore · <span id="maxLev">100x max</span></div></div>
    </div>
    <div class="metric"><div class="metric-label">Mark Price</div><div id="markPrice" class="metric-value">—</div></div>
    <div class="metric"><div class="metric-label">Oracle</div><div id="oraclePrice" class="metric-value">—</div></div>
    <div class="metric"><div class="metric-label">24h Change</div><div class="metric-value positive">+2.41%</div></div>
    <div class="metric"><div class="metric-label">Open Interest</div><div class="metric-value">$24.8M <span style="color:#7f8b9a;font-size:9px">SIM</span></div></div>
    <div class="metric"><div class="metric-label">Funding / 8h</div><div class="metric-value positive">0.0041%</div></div>
  </section>

  <main class="workspace">
    <aside id="watchlist" class="watchlist"><div class="section-title">Markets</div></aside>
    <section class="center">
      <div class="chart-head"><div class="tabs"><b>CHART</b><span>TRADES</span><span>FUNDING</span></div><div class="pill">WMCORE INDEX</div></div>
      <div class="chart-wrap">
        <div class="chart-grid"></div>
        <svg id="priceChart" viewBox="0 0 900 310" preserveAspectRatio="none"></svg>
        <div class="chart-badge">TESTNET SIMULATED INDEX · EXECUTION ENGINE PREVIEW</div>
      </div>
      <div class="books">
        <div class="book"><div class="section-title">Order Book · Asks</div><div class="book-head"><span>Price</span><span>Size</span></div><div id="asks"></div></div>
        <div class="book"><div class="section-title">Order Book · Bids</div><div class="book-head"><span>Price</span><span>Size</span></div><div id="bids"></div></div>
      </div>
    </section>

    <aside class="trade-panel">
      <div class="trade-tabs">
        <button id="buyTab" class="trade-tab buy active">LONG / BUY</button>
        <button id="sellTab" class="trade-tab sell">SHORT / SELL</button>
      </div>
      <div class="form">
        <div class="type-toggle"><button id="limitType" class="active">LIMIT</button><button id="marketType">MARKET</button></div>
        <div class="label-line"><span>Price</span><span>USD</span></div>
        <input id="priceInput" class="control" inputmode="decimal" />
        <div class="label-line"><span>Size</span><span id="sizeAsset">BTC</span></div>
        <input id="sizeInput" class="control" inputmode="decimal" value="0.01" />
        <div class="label-line"><span>Leverage</span><span id="levCap">Max 100x</span></div>
        <div id="leverageGrid" class="leverage-grid"></div>
        <div class="risk">High leverage materially increases liquidation risk. Market caps are enforced by WMCore; 100x is available only where the market risk configuration allows it.</div>
        <div class="summary">
          <div class="sum-row"><span>Test collateral</span><b>10,000.00 USDC</b></div>
          <div class="sum-row"><span>Order value</span><b id="orderValue">—</b></div>
          <div class="sum-row"><span>Initial margin</span><b id="marginValue">—</b></div>
          <div class="sum-row"><span>Wallet</span><b id="walletState">Not connected</b></div>
        </div>
        <button id="submitOrder" class="submit" disabled>CONNECT WALLET TO TRADE</button>
      </div>
    </aside>
  </main>

  <section class="account-area">
    <div class="account-head"><b>OPEN ORDERS</b><span>POSITIONS</span><span>FILLS</span><span>ORDER HISTORY</span></div>
    <div class="account-grid">
      <div class="account-card"><div class="metric-label">Equity</div><div class="metric-value">$10,000.00</div></div>
      <div class="account-card"><div class="metric-label">Available Margin</div><div class="metric-value">$10,000.00</div></div>
      <div class="account-card"><div class="metric-label">Unrealized PnL</div><div class="metric-value">$0.00</div></div>
      <div class="account-card"><div class="metric-label">Account Leverage</div><div class="metric-value">0.00x</div></div>
    </div>
    <div class="orders-wrap"><table class="orders"><thead><tr><th>Market</th><th>Side</th><th>Type</th><th>Price</th><th>Size</th><th>Leverage</th><th>Status</th><th></th></tr></thead><tbody id="ordersBody"><tr><td colspan="8" class="empty">Connect wallet to load signed testnet orders.</td></tr></tbody></table></div>
  </section>
</div>
<div id="toast" class="toast hidden"></div>
`;

const $ = <T extends HTMLElement>(id:string) => document.getElementById(id) as T;
const money = (v:number) => v >= 1000 ? "$" + v.toLocaleString(undefined,{maximumFractionDigits:2}) : "$" + v.toLocaleString(undefined,{maximumFractionDigits:4});

function currentMarket() { return markets.find(m => m.symbol === selectedSymbol)!; }
function toast(message:string) { const el=$("toast"); el.textContent=message; el.classList.remove("hidden"); setTimeout(()=>el.classList.add("hidden"),3200); }
function shortAddress(a:string) { return a ? a.slice(0,6)+"…"+a.slice(-4) : ""; }

function renderMarkets() {
  const root=$("watchlist");
  root.innerHTML='<div class="section-title">Markets</div>'+markets.map(m=>`
    <button class="market-row ${m.symbol===selectedSymbol?"active":""}" data-symbol="${m.symbol}">
      <div class="row-symbol">${m.symbol}</div>
      <div class="row-price"><span>${money(Number(m.markPrice))}</span><span class="positive">+${m.base==="WMC"?"1.8":"2.4"}%</span></div>
    </button>`).join("");
  root.querySelectorAll<HTMLButtonElement>(".market-row").forEach(btn=>btn.onclick=()=>{selectedSymbol=btn.dataset.symbol!; leverage=5; renderMarkets(); refreshMarket();});
}

function renderLeverage(m:Market) {
  const allowed=LEVERAGE_TIERS.filter(x=>x<=m.maxLeverage);
  if (!allowed.includes(leverage)) leverage=allowed[Math.min(allowed.length-1,3)] as Leverage;
  $("leverageGrid").innerHTML=allowed.map(x=>`<button class="lev ${x===leverage?"active":""}" data-lev="${x}">${x}x</button>`).join("");
  $("leverageGrid").querySelectorAll<HTMLButtonElement>(".lev").forEach(btn=>btn.onclick=()=>{leverage=Number(btn.dataset.lev) as Leverage; renderLeverage(m); updateSummary();});
  $("levCap").textContent="Max "+m.maxLeverage+"x";
  $("maxLev").textContent=m.maxLeverage+"x max";
}

function drawChart(mark:number) {
  const points=Array.from({length:48},(_,i)=>{
    const wave=Math.sin(i/4.2)*0.0045 + Math.cos(i/8.7)*0.003 + (i/47)*0.006;
    return mark*(1+wave);
  });
  const min=Math.min(...points), max=Math.max(...points), range=max-min||1;
  const xy=points.map((p,i)=>`${(i/(points.length-1))*900},${280-((p-min)/range)*220}`).join(" ");
  $("priceChart").innerHTML=`
    <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d9b46b" stop-opacity=".28"/><stop offset="100%" stop-color="#d9b46b" stop-opacity="0"/></linearGradient></defs>
    <polygon points="0,310 ${xy} 900,310" fill="url(#area)"/>
    <polyline points="${xy}" fill="none" stroke="#d9b46b" stroke-width="2"/>
  `;
}

async function refreshMarket() {
  const m=currentMarket();
  $("marketName").textContent=m.symbol;
  $("assetIcon").textContent=m.base==="BTC"?"₿":m.base==="ETH"?"Ξ":m.base==="GOLD"?"Au":"W";
  $("sizeAsset").textContent=m.base;
  $("markPrice").textContent=money(Number(m.markPrice));
  $("priceInput").value=m.markPrice;
  renderLeverage(m);
  drawChart(Number(m.markPrice));
  try {
    const [book,oracle]=await Promise.all([publicClient.orderbook(m.symbol),publicClient.oracle(m.symbol)]) as any[];
    $("oraclePrice").textContent=money(Number(oracle.oraclePrice));
    $("asks").innerHTML=[...book.asks].reverse().map((r:any)=>`<div class="book-row"><span class="ask">${Number(r[0]).toLocaleString()}</span><span>${r[1]}</span></div>`).join("");
    $("bids").innerHTML=book.bids.map((r:any)=>`<div class="book-row"><span class="bid">${Number(r[0]).toLocaleString()}</span><span>${r[1]}</span></div>`).join("");
  } catch { $("oraclePrice").textContent="API OFFLINE"; }
  updateSummary();
}

function updateSummary() {
  const m=currentMarket();
  const px=orderType==="MARKET"?Number(m.markPrice):Number(($("priceInput") as HTMLInputElement).value);
  const size=Number(($("sizeInput") as HTMLInputElement).value);
  const value=px*size;
  $("orderValue").textContent=Number.isFinite(value)?money(value):"—";
  $("marginValue").textContent=Number.isFinite(value)?money(value/leverage):"—";
}

async function connectWallet() {
  if (!window.ethereum) return toast("No injected EVM wallet found. Install a compatible wallet first.");
  try {
    const provider=new BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts",[]);
    const signer=await provider.getSigner();
    walletAddress=await signer.getAddress();
    tradingClient=new WinmarClient({baseUrl:API_BASE,environment:"testnet",signer});
    const network=await provider.getNetwork();
    $("walletBtn").textContent=shortAddress(walletAddress);
    $("walletState").textContent=shortAddress(walletAddress);
    $("submitOrder").removeAttribute("disabled");
    updateSideButton();
    toast(network.chainId===12142816n ? "Wallet connected on Winmar Chain. Testnet actions are signatures only." : "Wallet connected for WMCore testnet signing. No on-chain transaction will be sent.");
    await refreshOrders();
  } catch(e:any) { toast(e?.message||"Wallet connection failed"); }
}

async function refreshOrders() {
  if (!tradingClient || !walletAddress) return;
  try {
    const response=await tradingClient.orders(walletAddress) as any;
    const orders=(response.orders||[]) as Order[];
    $("ordersBody").innerHTML=orders.length?orders.slice().reverse().map(o=>`<tr>
      <td>${o.market}</td><td class="${o.side==="BUY"?"positive":"negative"}">${o.side}</td><td>${o.type}</td>
      <td>${o.price}</td><td>${o.size}</td><td>${o.leverage}x</td><td>${o.status}</td>
      <td>${o.status==="OPEN"?`<button class="cancel" data-cancel="${o.id}">CANCEL</button>`:""}</td></tr>`).join("")
      :'<tr><td colspan="8" class="empty">No signed testnet orders yet.</td></tr>';
    document.querySelectorAll<HTMLButtonElement>("[data-cancel]").forEach(btn=>btn.onclick=async()=>{try{await tradingClient!.cancelOrder(btn.dataset.cancel!);toast("Order canceled");await refreshOrders();}catch(e:any){toast(e?.message||"Cancel failed");}});
  } catch(e:any) { toast(e?.message||"Could not load orders"); }
}

function updateSideButton() {
  $("buyTab").className="trade-tab buy "+(side==="BUY"?"active":"");
  $("sellTab").className="trade-tab sell "+(side==="SELL"?"active":"");
  const submit=$("submitOrder") as HTMLButtonElement;
  submit.className="submit "+(side==="SELL"?"sell":"");
  submit.textContent=walletAddress?(side==="BUY"?"PLACE LONG / BUY":"PLACE SHORT / SELL"):"CONNECT WALLET TO TRADE";
}

async function placeOrder() {
  if (!tradingClient) return connectWallet();
  const m=currentMarket();
  const size=($("sizeInput") as HTMLInputElement).value;
  const price=($("priceInput") as HTMLInputElement).value;
  try {
    ($("submitOrder") as HTMLButtonElement).disabled=true;
    const order=await tradingClient.placeOrder({market:m.symbol,side,type:orderType,size,price:orderType==="LIMIT"?price:undefined,leverage});
    toast("Signed testnet order accepted: "+(order as any).id.slice(0,8)+"…");
    await refreshOrders();
  } catch(e:any) { toast(e?.message||"Order rejected"); }
  finally { ($("submitOrder") as HTMLButtonElement).disabled=false; }
}

$("walletBtn").onclick=connectWallet;
$("buyTab").onclick=()=>{side="BUY";updateSideButton();};
$("sellTab").onclick=()=>{side="SELL";updateSideButton();};
$("limitType").onclick=()=>{orderType="LIMIT";$("limitType").classList.add("active");$("marketType").classList.remove("active");($("priceInput") as HTMLInputElement).disabled=false;updateSummary();};
$("marketType").onclick=()=>{orderType="MARKET";$("marketType").classList.add("active");$("limitType").classList.remove("active");($("priceInput") as HTMLInputElement).disabled=true;updateSummary();};
$("priceInput").addEventListener("input",updateSummary);
$("sizeInput").addEventListener("input",updateSummary);
$("submitOrder").onclick=placeOrder;

async function boot() {
  try {
    const [status,marketResponse]=await Promise.all([publicClient.status(),publicClient.markets()]) as any[];
    markets=marketResponse.markets;
    $("apiState").textContent=status.status==="up"?"WMCORE API ONLINE":"API DEGRADED";
  } catch {
    markets=[
      {symbol:"BTC-USD-PERP",base:"BTC",quote:"USD",maxLeverage:100,tickSize:"0.1",lotSize:"0.001",markPrice:"95000"},
      {symbol:"ETH-USD-PERP",base:"ETH",quote:"USD",maxLeverage:100,tickSize:"0.01",lotSize:"0.01",markPrice:"3500"},
      {symbol:"WMC-USD-PERP",base:"WMC",quote:"USD",maxLeverage:25,tickSize:"0.0001",lotSize:"1",markPrice:"0.1"},
      {symbol:"GOLD-USD-PERP",base:"GOLD",quote:"USD",maxLeverage:50,tickSize:"0.1",lotSize:"0.01",markPrice:"2750"}
    ];
    $("apiState").textContent="STATIC PREVIEW";
  }
  renderMarkets();
  await refreshMarket();
  updateSideButton();
}
boot();
