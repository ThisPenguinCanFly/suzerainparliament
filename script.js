/* ===========================
   DATA
=========================== */

const parties = [];
let totalParliamentSeats = 250;
let draggedIndex = null;
let draggedEl = null;
let startIndex = null;

let EXPORT_WIDTH = 600;
let EXPORT_HEIGHT = 600 + length * 45;

const COLOR_PALETTE = [
    
    '#A32635',
    '#AF4A50',
    '#B24A12',
    '#BF9200',
    '#2A8A73',
    '#306600',
    '#1673A3',
    '#3DB8F0',
    '#4F2845',
    '#7A1E3A',
    '#73451F',
    '#343434',
    '#A6A6A6',
];


const AVAILABLE_LOGOS = [
    { id: 'hammerandsickle',  src: 'logo/HammerAndSickle.png' },
    { id: 'BFF',  src: 'logo/BFF.png' },
    { id: 'star',  src: 'logo/Star.png' },
    { id: 'csp',  src: 'logo/CSP.png' },
    { id: 'LU',  src: 'logo/LU.png' },
    { id: 'fistandrose',  src: 'logo/FistAndRose.png' },
    { id: 'wpb',  src: 'logo/WPB.png' },
    { id: 'bfp',  src: 'logo/BFP.png' },
    { id: 'pfjp',  src: 'logo/PFJP.png' },
    { id: 'Reform',  src: 'logo/Reform.png' },
    { id: 'Oligarch',  src: 'logo/Oligarch.png' },
    { id: 'usp',  src: 'logo/USP.png' },
    { id: 'OldGuard',  src: 'logo/OldGuard.png' },
    { id: 'YoungSords',  src: 'logo/YoungSords.png' },
    { id: 'NFP',  src: 'logo/NFP.png' }
];

let selectedLogoId = null;
const logoImages = {};
let selectedColor = '#667eea';


/* ===========================
   DOM ELEMENTS
=========================== */

const canvas = document.getElementById('parliamentCanvas');
const ctx = canvas.getContext('2d');

const form = document.getElementById('addPartyForm');
const partiesDisplay = document.getElementById('partiesDisplay');
const totalSeatsDisplay = document.getElementById('totalSeatsDisplay');
const displayTitle = document.getElementById('displayTitle');
const saveBtn = document.getElementById('saveBtn');
const seatsRemainingEl = document.getElementById('seatsRemaining');
const totalSeatsInput = document.getElementById('totalSeatsInput');
const parliamentTitle = document.getElementById('parliamentTitle');
const updateTotalBtn = document.getElementById('updateTotalBtn');
const logoPicker = document.getElementById('logoPicker');
const colorPaletteEl = document.getElementById('colorPalette');
const colorInput = document.getElementById('partyColor');


COLOR_PALETTE.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.background = color;

    swatch.addEventListener('click', () => {
        selectColor(color);
    });

    colorPaletteEl.appendChild(swatch);
});

colorInput.addEventListener('input', e => {
    selectColor(e.target.value);
});

AVAILABLE_LOGOS.forEach(logo => {
    const img = new Image();
    img.src = logo.src;
    logoImages[logo.id] = img;

    const option = document.createElement('div');
    option.className = 'logo-option';
    option.dataset.logoId = logo.id;

    const icon = document.createElement('img');
    icon.src = logo.src;
    option.appendChild(icon);

    option.addEventListener('click', () => {
        const isAlreadySelected = option.classList.contains('selected');

        // First remove selection from all
        document.querySelectorAll('.logo-option')
            .forEach(el => el.classList.remove('selected'));

        if (isAlreadySelected) {
            // If clicking the selected one → unselect it
            selectedLogoId = null;
        } else {
            // Otherwise select it
            option.classList.add('selected');
            selectedLogoId = logo.id;
        }
    });


    logoPicker.appendChild(option);
});

parliamentTitle.addEventListener('input', e => {
    displayTitle.textContent = e.target.value;
});

form.addEventListener('submit', e => {
    e.preventDefault();
    
    const name = partyName.value.trim();
    const color = selectedColor;
    const seats = parseInt(partySeats.value);
    const percentage = seats / totalParliamentSeats;

    if (!name || seats <= 0) return;

    parties.push({
        name,
        color,
        seats,
        percentage,
        logoId: selectedLogoId
    });

    form.reset();
    partyColor.value = '#667eea';

    selectedLogoId = null;
    document.querySelectorAll('.logo-option')
        .forEach(el => el.classList.remove('selected'));

    updatePartyList();
    updateSeatsRemaining();
    drawParliament();
});

function removeParty(index) {
    parties.splice(index, 1);
    updatePartyList();
    updateSeatsRemaining();
    drawParliament();
}

function updateSeatsRemaining() {
    const used = parties.reduce((s, p) => s + p.seats, 0);
    const remaining = totalParliamentSeats - used;

    seatsRemainingEl.textContent =
        remaining >= 0
            ? `${remaining} seats remaining`
            : `Warning: ${Math.abs(remaining)} seats over limit!`;

    seatsRemainingEl.classList.toggle('error', remaining < 0);
}

function updatePartyList() {
    if (!parties.length) {
        partiesDisplay.innerHTML = '<div class="empty-state">No parties added yet</div>';
        return;
    }

    partiesDisplay.innerHTML = `
        <div class="parties-section">
            ${parties.map((p, i) => `
                <div class="party-list-item"
                     data-index="${i}">
                     
                    <div class="party-left">
                        <div class="party-icon" style="background:${p.color}">
                            ${p.logoId ? `<img src="${logoImages[p.logoId].src}">` : ''}
                        </div>
                        <div class="party-name-display">${p.name}</div>
                    </div>

                    <div>
                        <span class="party-seats-display">${p.seats}</span>
                        <button class="btn btn-danger delete-btn" data-index="${i}">×</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('pointerdown', e => {
            e.stopPropagation(); // 🚀 prevents drag from starting
        });

        btn.addEventListener('click', e => {
            e.stopPropagation();
            const index = Number(btn.dataset.index);
            removeParty(index);
        });
    });
    enableTouchReorder();
}

function drawParliament() {
    drawParliamentToContext(ctx, canvas.width, canvas.height);
}

function sumArray(arr) {
    return arr.reduce((sum, value) => sum + value, 0);
}

function copyPartySeatsToRow(finalSeatsCount, partySeatsPerRow, rowIndex) {
    finalSeatsCount[rowIndex] = [...partySeatsPerRow];
}

function decimalPart(n) {
    return Math.abs(n % 1);
}

function enableDragAndDrop() {
    const items = document.querySelectorAll('.party-list-item');

    items.forEach(item => {
        item.addEventListener('dragstart', e => {
            draggedIndex = Number(item.dataset.index);
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            draggedIndex = null;
            item.classList.remove('dragging');
        });

        item.addEventListener('dragover', e => {
            e.preventDefault();
        });

        item.addEventListener('drop', e => {
            e.preventDefault();

            const targetIndex = Number(item.dataset.index);
            if (draggedIndex === null || draggedIndex === targetIndex) return;

            moveParty(draggedIndex, targetIndex);
        });
    });
}

function moveParty(fromIndex, toIndex) {
    const movedParty = parties.splice(fromIndex, 1)[0];
    parties.splice(toIndex, 0, movedParty);

    updatePartyList();
    drawParliament();
}

function enableTouchReorder() {
    const items = document.querySelectorAll('.party-list-item');

    items.forEach(item => {
        item.addEventListener('pointerdown', onPointerDown);
    });
}

function onPointerDown(e) {
    draggedEl = e.currentTarget;
    startIndex = Number(draggedEl.dataset.index);

    draggedEl.classList.add('dragging');
    draggedEl.setPointerCapture(e.pointerId);

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(e) {
    if (!draggedEl) return;

    const draggedRect = draggedEl.getBoundingClientRect();
    draggedEl.style.transform = `translateY(${e.clientY - draggedRect.top - draggedRect.height / 2}px)`;

    const items = [...document.querySelectorAll('.party-list-item')];

    for (const item of items) {
        if (item === draggedEl) continue;

        const rect = item.getBoundingClientRect();
        if (e.clientY > rect.top && e.clientY < rect.bottom) {
            item.classList.add('drop-target');
        } else {
            item.classList.remove('drop-target');
        }
    }
}

function onPointerUp(e) {
    if (!draggedEl) return;

    draggedEl.releasePointerCapture(e.pointerId);

    const items = [...document.querySelectorAll('.party-list-item')];
    let targetIndex = startIndex;

    items.forEach(item => {
        if (item.classList.contains('drop-target')) {
            targetIndex = Number(item.dataset.index);
            item.classList.remove('drop-target');
        }
    });

    draggedEl.style.transform = '';
    draggedEl.classList.remove('dragging');

    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);

    if (targetIndex !== startIndex) {
        moveParty(startIndex, targetIndex);
    }

    draggedEl = null;
    startIndex = null;
}

function selectColor(color) {
    selectedColor = color;
    colorInput.value = color;

    document.querySelectorAll('.color-swatch')
        .forEach(s => s.classList.remove('selected'));

    const matched = [...document.querySelectorAll('.color-swatch')]
        .find(s => s.style.background === color);

    if (matched) matched.classList.add('selected');
}

async function handleSaveImage() {


    let length = parties.length - 4;

    if(length < 0){
        length = 0;
    }
    EXPORT_WIDTH = EXPORT_WIDTH;
    EXPORT_HEIGHT = EXPORT_HEIGHT + length * 45;

    // Make sure logos are loaded
    await Promise.all(
        Object.values(logoImages).map(img =>
            img.complete ? Promise.resolve() :
            new Promise(res => img.onload = res)
        )
    );

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = EXPORT_WIDTH;
    exportCanvas.height = EXPORT_HEIGHT;

    const exportCtx = exportCanvas.getContext('2d');

    // Background
    exportCtx.fillStyle = '#141414';
    exportCtx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

    // 🔹 Draw seats using your existing logic
    drawSeats(exportCtx, EXPORT_WIDTH, 400);

    // 🔹 Draw title (ONLY for export)
    drawTitle(exportCtx, EXPORT_WIDTH);

    // 🔹 Draw legend (ONLY for export)
    drawLegend(exportCtx, 30, 410);

    // Save
    const link = document.createElement('a');
    link.download = 'parliament.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
}

function drawParliamentToContext(ctx, width, height) {
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, width, height);

    drawSeats(ctx, width, height);
}

function drawSeats(ctx, width, height) {

    const centerX = width / 2;
    const centerY = height - 40;

    const rows = [19, 22, 26, 29, 33, 37, 40, 44];
    const minRadius = 115;
    const maxRadius = 260;

    let finalSeatsCount = Array.from(
        { length: rows.length },
        () => Array(parties.length).fill(0)
    );

    let partySeatsPerRow;
    let carriedDecimal = Array(parties.length).fill(0);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {

        partySeatsPerRow = Array(parties.length).fill(0);
        let seatsFromDecimal = 0;

        for (let i = 0; i < partySeatsPerRow.length; i++) {
            partySeatsPerRow[i] = parties[i].percentage * rows[rowIndex];
            
            seatsFromDecimal += decimalPart(partySeatsPerRow[i]);
        }

        seatsFromDecimal = Math.round(seatsFromDecimal);

        while (seatsFromDecimal >= 1) {
            console.log(rowIndex,seatsFromDecimal)
            console.log(JSON.stringify(partySeatsPerRow));
            console.log(JSON.stringify(carriedDecimal));
            let max = -1;
            let indexJ = -1;

            for (let j = 0; j < partySeatsPerRow.length; j++) {
                if (decimalPart(partySeatsPerRow[j]) + carriedDecimal[j] > max) {
                    console.log(decimalPart(partySeatsPerRow[j]), carriedDecimal[j])
                    max = decimalPart(partySeatsPerRow[j]) + carriedDecimal[j];
                    indexJ = j;
                }
            }
            if(carriedDecimal[indexJ] > 1){
                carriedDecimal[indexJ] =
                    carriedDecimal[indexJ] +
                    decimalPart(partySeatsPerRow[indexJ]) - 1;
            }
            else{
                carriedDecimal[indexJ] = 0;
            }


            partySeatsPerRow[indexJ] =
                Math.ceil(partySeatsPerRow[indexJ]);

            seatsFromDecimal--;
        }

        for (let j = 0; j < carriedDecimal.length; j++) {
            carriedDecimal[j] += decimalPart(partySeatsPerRow[j]);
            partySeatsPerRow[j] = Math.floor(partySeatsPerRow[j]);
        }

        finalSeatsCount[rowIndex] = [...partySeatsPerRow];
    }

    console.log(finalSeatsCount)
    let rowCount = rows.length;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {

        const seatsInRow = rows[rowIndex];
        if (seatsInRow === 0) continue;

        const radius =
            minRadius + (maxRadius - minRadius) *
            (rowIndex / (rowCount - 1));

        let seatIndexInRow = 0;

        for (let partyIndex = 0; partyIndex < parties.length; partyIndex++) {

            const seatsForParty =
                finalSeatsCount[rowIndex][partyIndex];

            for (let s = 0; s < seatsForParty; s++) {

                const angle = Math.PI *
                    (seatsInRow === 1
                        ? 0.5
                        : seatIndexInRow / (seatsInRow - 1));

                const x = centerX - Math.cos(angle) * radius;
                const y = centerY - Math.sin(angle) * radius;

                drawSeatToContext(ctx, { x, y }, parties[partyIndex]);
                seatIndexInRow++;
            }
        }

        while (seatIndexInRow < seatsInRow) {

            const angle = Math.PI *
                (seatsInRow === 1
                    ? 0.5
                    : seatIndexInRow / (seatsInRow - 1));

            const x = centerX - Math.cos(angle) * radius;
            const y = centerY - Math.sin(angle) * radius;

            drawSeatToContext(ctx, { x, y }, null);
            seatIndexInRow++;
        }
    }

    const title = "250";

    ctx.fillStyle = "#ecdcab";
    ctx.font = "bold 40px Oswald";
    ctx.textAlign = "center";
    ctx.fillText(title, width / 2, 375);

    const link = "thispenguincanfly.github.io/suzerainparliament";

    ctx.fillStyle = "#ecdcab";
    ctx.font = "12px OldStandardTT";
    ctx.textAlign = "center";
    ctx.fillText(link, width/2, 400);

}

function drawSeatToContext(ctx, pos, party) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = party ? party.color : '#555';
    ctx.fill();
}

function drawTitle(ctx, width) {

    const title = parliamentTitle.value || "Parliament";

    ctx.fillStyle = "#ecdcab";
    ctx.font = "normal 28px OldStandardTT";
    ctx.textAlign = "center";
    ctx.fillText(title, width / 2, 60);
}

function drawLegend(ctx, width, height) {

    const circleRadius = 16;
    const rowHeight = 45;

    const startX = width;
    let startY = height;

    ctx.font = "20px OldStandardTT";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    parties.forEach(party => {

        const centerY = startY + circleRadius;

        // 🔵 Draw colored circle
        ctx.beginPath();
        ctx.arc(startX + circleRadius, centerY, circleRadius, 0, Math.PI * 2);
        ctx.fillStyle = party.color;
        ctx.fill();

        // 🖼 Draw logo inside circle (if exists)
        if (party.logoId && logoImages[party.logoId]?.complete) {

            const logoSize = circleRadius * 1.4;

            ctx.save();
            ctx.beginPath();
            ctx.arc(startX + circleRadius, centerY, circleRadius, 0, Math.PI * 2);
            ctx.clip();

            ctx.drawImage(
                logoImages[party.logoId],
                startX + circleRadius - logoSize / 2,
                centerY - logoSize / 2,
                logoSize,
                logoSize
            );

            ctx.restore();
        }

        ctx.textAlign = "left";
        ctx.fillStyle = "#B0B0B0";
        ctx.fillText(
            `${party.name}`,
            startX + circleRadius * 2 + 20,
            centerY
        );

        ctx.textAlign = "right";
        ctx.fillText(
            `${party.seats}`,
            EXPORT_WIDTH - 40,
            centerY
        );

        startY += rowHeight;
    });
}

saveBtn.addEventListener('click', handleSaveImage);

/* ===========================
   INIT
=========================== */

updateSeatsRemaining();
drawParliament();

function printArray(array){
    for(let i = 0; i < array.length; i++){
        console.log(i, " ", array[i])
    }
}