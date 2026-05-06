const grid = document.getElementById('qr-grid');
const countInput = document.getElementById('tableCount');
const btn = document.getElementById('generateBtn');

function tableUrl(table) {
  return `${window.location.origin}/table/T${table}`;
}

function qrSrc(url) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
}

function renderQrs() {
  const count = Math.max(1, Math.min(200, Number(countInput.value || 1)));
  const html = [];

  for (let i = 1; i <= count; i += 1) {
    const tUrl = tableUrl(i);
    html.push(`<div class="qr-card">
      <h4>Table T${i}</h4>
      <img src="${qrSrc(tUrl)}" alt="QR for table ${i}" />
      <div class="muted">${tUrl}</div>
      <a href="/table/T${i}" target="_blank" rel="noreferrer">Open Table Page</a>
    </div>`);
  }

  grid.innerHTML = html.join('');
}

btn.addEventListener('click', renderQrs);
renderQrs();
