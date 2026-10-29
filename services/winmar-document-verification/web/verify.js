/* Public Explorer document lookup — read-only, no wallet connection required. */
(function () {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const note = $('#verification-state'), details = $('#record-details'), integrity = $('#file-integrity'), input = $('#source-pdf');
  const overlay = $('#certificate-overlay'), master = $('#certificate-master'), previewNote = $('#preview-note');
  const openCertificate = $('#open-certificate'), download = $('#download-certificate'), print = $('#print-certificate');
  let current = null, generated = null, fileVersion = 0;
  function state(text, type = 'pending') { note.textContent = text; note.dataset.status = type; }
  function withTimeout(promise, ms = 25000) { return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('Verification lookup timed out')), ms))]); }
  async function rpc(method, params = []) { const Controller=window.AbortController|| (typeof AbortController!=='undefined'?AbortController:null); if(!Controller){ const res=await fetch('https://rpc.winmarchain.io/',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:Date.now(),method,params})}); if(!res.ok)throw new Error('RPC unavailable'); const payload=await res.json(); if(payload.error)throw new Error('RPC error'); return payload.result; } const controller=new Controller(); const timer=setTimeout(()=>controller.abort(),10000); try { const res = await fetch('https://rpc.winmarchain.io/', { method:'POST', cache:'no-store', headers:{'Content-Type':'application/json'}, body:JSON.stringify({jsonrpc:'2.0',id:Date.now(),method,params}), signal:controller.signal }); if (!res.ok) throw new Error('RPC unavailable'); const payload=await res.json(); if(payload.error) throw new Error('RPC error'); return payload.result; } finally { clearTimeout(timer); } }
  function requestedId() { const match=location.pathname.match(/\/verify\/(0x[0-9a-fA-F]{64})\/?$/); return window.WinmarVerificationProof.docId(match?.[1] || new URLSearchParams(location.search).get('documentId')); }
  function copyText(id) { const node = $('#'+id), value = node?.href || node?.textContent; if (value) navigator.clipboard?.writeText(value).catch(()=>{}); }
  function setCertificatePending(message) { overlay.hidden=false; overlay.textContent=message; previewNote.textContent=message; master.hidden=true; download.disabled=true; print.disabled=true; openCertificate.hidden=true; }
  function reportNumber() { return `WMC-${current.issuedAt.slice(0,4)}-${current.documentId.slice(2,10).toUpperCase()}`; }
  async function createVerifiedPreview() {
    const canvas = await window.WinmarCertificateRenderer.render({ ...current, status:'verified', sha256:current.documentId.slice(2), subject:`Original PDF ${current.documentId.slice(2,14).toUpperCase()}…`, issuer:current.issuerWallet, documentType:'On-chain Document Record', pageLabel:'1 of 1' });
    generated = canvas.toDataURL('image/png'); master.src=generated; master.alt=`Verified Winmar Document Authenticity Certificate ${reportNumber()}`;
    master.hidden=false; overlay.hidden=true; previewNote.textContent='LIVE ON-CHAIN CERTIFICATE — values below come from the current Winmar Chain registration.';
    openCertificate.href=generated; openCertificate.download=`${reportNumber()}-certificate.png`; openCertificate.hidden=false; download.disabled=false; print.disabled=false;
  }
  async function verifyLocalFile() {
    const sequence=++fileVersion, file=input.files?.[0];
    if(!file){integrity.textContent='Select the ORIGINAL source PDF to verify its SHA-256.';integrity.dataset.status='pending';return;}
    if(!file.name.toLowerCase().endsWith('.pdf')||file.size<=0||file.size>10*1024*1024){integrity.textContent='Choose a valid PDF no larger than 10 MB.';integrity.dataset.status='failed';setCertificatePending('INVALID PDF — certificate actions are unavailable.');return;}
    integrity.textContent='Calculating SHA-256 locally…'; integrity.dataset.status='pending';
    try { const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer()); if(sequence!==fileVersion)return; const actual='0x'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      if(current?.status==='registered'&&actual===current.documentId){integrity.textContent='VERIFIED ON-CHAIN — this original PDF matches the active blockchain record.';integrity.dataset.status='verified';await createVerifiedPreview();}
      else {integrity.textContent='DOCUMENT HASH MISMATCH — this PDF is not the registered original.';integrity.dataset.status='failed';setCertificatePending('DOCUMENT HASH MISMATCH — no authenticated certificate is available.');}
    } catch {if(sequence!==fileVersion)return;integrity.textContent='Could not read or hash this PDF.';integrity.dataset.status='failed';setCertificatePending('FILE COMPARISON FAILED — certificate actions are unavailable.');}
  }
  input.addEventListener('change',verifyLocalFile); document.querySelectorAll('.copy').forEach(b=>b.addEventListener('click',()=>copyText(b.dataset.copy)));
  download.addEventListener('click',async()=>{
    if (!generated) { state('Generate the verified certificate before downloading.', 'failed'); return; }
    if (!window.PDFLib?.PDFDocument) { state('Certificate PDF library is unavailable. Refresh once and try again.', 'failed'); return; }
    download.disabled=true;
    try {
      const pdf=await withTimeout(window.PDFLib.PDFDocument.create(),10000);
      const image=await withTimeout(pdf.embedPng(generated),10000);
      const page=pdf.addPage([image.width,image.height]);
      page.drawImage(image,{x:0,y:0,width:image.width,height:image.height});
      const bytes=await withTimeout(pdf.save(),15000);
      const blob=new Blob([bytes],{type:'application/pdf'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`${reportNumber()}-certificate.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),3000);
      state('Verified certificate PDF generated and download started.', 'verified');
    } catch (error) {
      state(`Certificate download failed — ${error?.message || 'please refresh and try again.'}`, 'failed');
    } finally { download.disabled=false; }
  });
  print.addEventListener('click',()=>{if(!generated)return;const win=window.open('','_blank','noopener');if(!win)return;win.document.write(`<img src="${generated}" style="max-width:100%;height:auto">`);win.document.close();win.focus();win.print();});
  async function start(){let id;try{id=requestedId();}catch{state('INVALID DOCUMENT ID — scan an official Winmar certificate QR or use a complete document ID.','failed');input.disabled=true;setCertificatePending('INVALID DOCUMENT ID');return;} state('Reading the current on-chain document record…');try{current=await withTimeout(window.WinmarVerificationProof.lookup(rpc,id));if(current.status==='not_registered'){state('NO ON-CHAIN DOCUMENT RECORD FOUND.','failed');input.disabled=true;setCertificatePending('NO ON-CHAIN DOCUMENT RECORD FOUND');return;}if(current.status==='revoked'){state('DOCUMENT REVOKED — this registration is not active.','failed');input.disabled=true;setCertificatePending('DOCUMENT REVOKED');return;}if(current.status!=='registered'){state('VERIFICATION TEMPORARILY UNAVAILABLE — the registration needs review.','failed');input.disabled=true;setCertificatePending('RECORD NOT READY FOR VERIFICATION');return;}details.hidden=false;$('#document-id').textContent=current.documentId;$('#issuer-wallet').textContent=current.issuerWallet;$('#issued-at').textContent=current.issuedAt;$('#block-number').textContent='#'+current.registrationBlockNumber;const tx=$('#registration-tx');tx.textContent=current.registrationTransactionHash;tx.href=current.transactionUrl||('https://scan.winmarchain.io/tx/'+current.registrationTransactionHash);$('#explorer-link').href=tx.href;state('ACTIVE ON-CHAIN RECORD FOUND — compare the original PDF to verify integrity.');integrity.textContent='Original-file integrity is awaiting comparison.';integrity.dataset.status='pending';await createVerifiedPreview();}catch(error){const detail=error?.message==='Verification lookup timed out'?'the RPC/indexer did not respond in time.':error?.message||'the on-chain record could not be read right now.';state('VERIFICATION TEMPORARILY UNAVAILABLE — '+detail,'failed');input.disabled=true;setCertificatePending('VERIFICATION TEMPORARILY UNAVAILABLE');}}
  start();
})();
