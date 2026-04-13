document.addEventListener('DOMContentLoaded', () => {
    setTimeout(syncWithFirebase, 1000);
});

// --- CLOUD SYNC ---
function syncWithFirebase() {
    if (!window.db) return;
    window.dbOnValue(window.dbRef(window.db, 'organisation'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('todoList').innerHTML = data.tasks || "";
            document.getElementById('guestList').innerHTML = data.guests || "";
            document.getElementById('budgetList').innerHTML = data.budget || "";
            document.getElementById('scheduleList').innerHTML = data.schedule || "";
            document.getElementById('songList').innerHTML = data.songs || "";
            document.getElementById('contactList').innerHTML = data.contacts || "";
            document.getElementById('docList').innerHTML = data.documents || "";
            
            sortGuests(); sortSchedule();
            updateTotal(); updateGuestTotal();
        }
    });
}

function saveData() {
    if (!window.dbSet) return;
    window.dbSet(window.dbRef(window.db, 'organisation'), {
        tasks: document.getElementById('todoList').innerHTML,
        guests: document.getElementById('guestList').innerHTML,
        budget: document.getElementById('budgetList').innerHTML,
        schedule: document.getElementById('scheduleList').innerHTML,
        songs: document.getElementById('songList').innerHTML,
        contacts: document.getElementById('contactList').innerHTML,
        documents: document.getElementById('docList').innerHTML
    });
}

// --- AJOUTS ---
function addTask() {
    const val = document.getElementById('taskInput').value;
    if (!val) return;
    createItem('todoList', `<span>${val}</span>`);
    document.getElementById('taskInput').value = ""; saveData();
}

function addBudgetItem() {
    const n = document.getElementById('budgetItemName').value;
    const a = document.getElementById('budgetItemAmount').value;
    if (!n) return;
    createItem('budgetList', `<div><strong>${n}</strong></div><div class="price-tag">${a} €</div>`);
    updateTotal(); saveData();
}

function addGuest() {
    const n = document.getElementById('guestName').value;
    const p = document.getElementById('guestPhone').value;
    const c = document.getElementById('guestCount').value || 1;
    if (!n) return;

    // On utilise les classes définies dans le CSS
    const html = `
        <div class="guest-info-container">
            <strong class="guest-name">${n}</strong>
            <div class="guest-details-row">
                <span class="guest-count-val guest-badge">${c} pers.</span>
                <span class="guest-phone-display">${p}</span>
            </div>
        </div>`;
    
    createItem('guestList', html);
    sortGuests(); 
    updateGuestTotal(); 
    
    document.getElementById('guestName').value = ""; 
    document.getElementById('guestPhone').value = ""; 
    document.getElementById('guestCount').value = "1";
    saveData();
}
function addScheduleItem() {
    const task = document.getElementById('scheduleTask').value;
    const time = document.getElementById('scheduleTime').value;
    if (!task || !time) return;
    createItem('scheduleList', `<span class="time-badge">${time}</span> <strong style="flex:1">${task}</strong>`);
    sortSchedule(); saveData();
}

function addSong() {
    const val = document.getElementById('songInput').value;
    if (!val) return;
    createItem('songList', `<span style="font-style:italic">🎵 ${val}</span>`);
    saveData();
}

function addContact() {
    const n = document.getElementById('contactName').value;
    const i = document.getElementById('contactInfo').value;
    const note = document.getElementById('contactNote').value;
    if (!n) return;
    const html = `<div><strong class="c-name">${n}</strong><br><span class="c-info" style="color:var(--accent); font-size:13px;">${i}</span><span class="c-note contact-note">${note}</span></div>`;
    createItem('contactList', html); saveData();
}

// --- LOGIQUE COMMUNE ---
function createItem(id, html) {
    const li = document.createElement('li');
    li.className = 'item-anim';
    li.innerHTML = `<div style="display:flex; align-items:center; gap:15px; flex:1">${html}</div> <button class="delete-btn" onclick="deleteItem(this)">🗑️</button>`;
    document.getElementById(id).appendChild(li);
}

function deleteItem(btn) {
    const li = btn.closest('li');
    li.classList.add('removing');
    setTimeout(() => {
        li.remove();
        updateTotal(); updateGuestTotal(); saveData();
        if (document.getElementById('modalOverlay').style.display === 'flex') closeModal();
    }, 300);
}

function changeStep(id, delta) {
    const input = document.getElementById(id);
    let newVal = (parseFloat(input.value) || 0) + delta;
    if (newVal < 0) newVal = 0;
    input.value = newVal;
}

// --- CALC & TRI ---
function sortGuests() {
    const list = document.getElementById('guestList');
    const items = Array.from(list.getElementsByTagName('li'));
    items.sort((a, b) => a.querySelector('strong').innerText.toLowerCase().localeCompare(b.querySelector('strong').innerText.toLowerCase()));
    list.innerHTML = ""; items.forEach(i => list.appendChild(i));
}

function sortSchedule() {
    const list = document.getElementById('scheduleList');
    const items = Array.from(list.getElementsByTagName('li'));
    items.sort((a, b) => a.querySelector('.time-badge').innerText.localeCompare(b.querySelector('.time-badge').innerText));
    list.innerHTML = ""; items.forEach(i => list.appendChild(i));
}

function updateTotal() {
    let total = 0;
    document.querySelectorAll('#budgetList .price-tag').forEach(s => total += parseFloat(s.innerText) || 0);
    animateValue(document.getElementById('totalAmount'), total);
}

function updateGuestTotal() {
    let total = 0;
    document.querySelectorAll('.guest-count-val').forEach(s => total += parseInt(s.innerText) || 0);
    document.getElementById('totalGuests').innerText = total;
}

function animateValue(obj, end) {
    const start = parseFloat(obj.innerText.replace(/\s/g, '')) || 0;
    let startTimestamp = null;
    const step = (ts) => {
        if (!startTimestamp) startTimestamp = ts;
        const progress = Math.min((ts - startTimestamp) / 400, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString('fr-FR');
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

// --- IMPORT / EXPORT CSV ---
function exportContacts() {
    let csv = "Nom;Contact;Note\n";
    document.querySelectorAll('#contactList li').forEach(item => {
        csv += `${item.querySelector('.c-name').innerText};${item.querySelector('.c-info').innerText};${item.querySelector('.c-note').innerText}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csv));
    link.setAttribute("download", "prestataires.csv"); link.click();
}

function triggerImport() { document.getElementById('importFileInput').click(); }
function handleImport(e) {
    const reader = new FileReader();
    reader.onload = function(evt) {
        const lines = evt.target.result.split('\n');
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(';');
            if (row.length >= 2 && row[0].trim() !== "") {
                createItem('contactList', `<div><strong class="c-name">${row[0]}</strong><br><span class="c-info" style="color:var(--accent); font-size:13px;">${row[1]}</span><span class="c-note contact-note">${row[2] || ""}</span></div>`);
            }
        }
        saveData(); e.target.value = "";
    };
    reader.readAsText(e.target.files[0], "UTF-8");
}

// --- UPLOAD PDF ---
async function uploadPDF() {
    const fileInput = document.getElementById('pdfFile');
    const nameInput = document.getElementById('docName');
    const status = document.getElementById('uploadStatus');
    const btn = document.getElementById('uploadBtn');

    if (!fileInput.files[0] || !nameInput.value) return alert("Remplissez tout !");

    status.style.display = "block"; btn.disabled = true;

    try {
        const fileRef = window.sRef(window.storage, 'docs/' + Date.now() + "_" + fileInput.files[0].name);
        await window.uploadBytes(fileRef, fileInput.files[0]);
        const url = await window.getDownloadURL(fileRef);

        createItem('docList', `<a href="${url}" target="_blank" class="doc-link">📄 <strong>${nameInput.value}</strong></a>`);
        saveData();
    } catch (e) { alert("Erreur d'envoi"); }
    status.style.display = "none"; btn.disabled = false;
}

function openModal(id, title) {
    // On récupère le contenu de la liste
    const content = document.getElementById(id).innerHTML;
    
    // On l'injecte dans la modale
    document.getElementById('modalBody').innerHTML = `<ul class="modal-list-full">${content}</ul>`;
    document.getElementById('modalTitle').innerText = title;
    
    const over = document.getElementById('modalOverlay');
    over.style.display = 'flex';
    setTimeout(() => over.classList.add('active'), 10);
}

function closeModal() {
    const over = document.getElementById('modalOverlay');
    over.classList.remove('active');
    setTimeout(() => over.style.display = 'none', 300);
}
