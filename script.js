
/* =========================================================
   1. CONFIGURATION & DEFAULT DATA
========================================================= */

// Party colors
const COLOR_PALETTE = [
    '#A32635', '#AF4A50', '#B24A12', '#BF9200',
    '#2A8A73', '#306600', '#1673A3', '#3DB8F0',
    '#4F2845', '#7A1E3A', '#73451F', '#343434',
    '#A6A6A6'
];

// Built-in party logos
const AVAILABLE_LOGOS = [
    { id: 'hammerandsickle', src: 'logo/HammerAndSickle.png' },
    { id: 'BFF', src: 'logo/BFF.png' },
    { id: 'star', src: 'logo/Star.png' },
    { id: 'csp', src: 'logo/CSP.png' },
    { id: 'LU', src: 'logo/LU.png' },
    { id: 'fistandrose', src: 'logo/FistAndRose.png' },
    { id: 'wpb', src: 'logo/WPB.png' },
    { id: 'bfp', src: 'logo/BFP.png' },
    { id: 'pfjp', src: 'logo/PFJP.png' },
    { id: 'Reform', src: 'logo/Reform.png' },
    { id: 'Oligarch', src: 'logo/Oligarch.png' },
    { id: 'usp', src: 'logo/USP.png' },
    { id: 'OldGuard', src: 'logo/OldGuard.png' },
    { id: 'YoungSords', src: 'logo/YoungSords.png' },
    { id: 'NFP', src: 'logo/NFP.png' }
];

// Default parliament settings
const DEFAULT_PARLIAMENT_SETTINGS = {
    nOfSeatsPerRow: [19, 22, 26, 29, 33, 37, 40, 44],
    seatRadius: 12,
    centerPadding: 120,
    betweenSeatsPadding: 0
};


/* =========================================================
   2. APPLICATION DATA & STATE
========================================================= */

// Logo storage
const logoImages = {};
let uploadedLogos = [];

// Selected party options
let selectedLogoId = null;
let selectedColor = '#667eea';

// Parliament configuration
let center = { x: 350, y: 350 };
let nOfSeatsPerRow = [...DEFAULT_PARLIAMENT_SETTINGS.nOfSeatsPerRow];

let seatRadius = DEFAULT_PARLIAMENT_SETTINGS.seatRadius;
let centerPadding = DEFAULT_PARLIAMENT_SETTINGS.centerPadding;
let betweenSeatsPadding = DEFAULT_PARLIAMENT_SETTINGS.betweenSeatsPadding;

let emptySeatColor = '#808080';

// Parliament data
let seatsArray = [];
let parties = [];

// Drag and drop state
let draggedEl = null;
let startIndex = null;
let pointerStartY = null;


/* =========================================================
   3. COLOR & LOGO PICKERS
========================================================= */

function InitializePartyPickers() {
    const colorPaletteEl = document.getElementById('colorPalette');
    const logoPicker = document.getElementById('logoPicker');
    const colorInput = document.getElementById('partyColor');

    // Create color palette
    colorPaletteEl.innerHTML = '';

    COLOR_PALETTE.forEach(color => {
        const swatch = document.createElement('div');

        swatch.className = 'color-swatch';
        swatch.dataset.color = color.toLowerCase();
        swatch.style.backgroundColor = color;

        swatch.addEventListener('click', () => {
            selectColor(color);
        });

        colorPaletteEl.appendChild(swatch);
    });

    // Custom color input
    colorInput.addEventListener('input', event => {
        selectColor(event.target.value);
    });

    // Create built-in logo picker
    logoPicker.innerHTML = '';

    AVAILABLE_LOGOS.forEach(logo => {
        const img = new Image();
        img.src = logo.src;
        logoImages[logo.id] = img;

        const option = document.createElement('div');
        option.className = 'logo-option';
        option.dataset.logoId = logo.id;
        option.title = logo.id;

        const icon = document.createElement('img');
        icon.src = logo.src;
        icon.alt = logo.id;

        option.appendChild(icon);

        option.addEventListener('click', () => {
            const isSelected = option.classList.contains('selected');

            ClearLogoSelection();

            if (!isSelected) {
                option.classList.add('selected');
                selectedLogoId = logo.id;
            }
        });

        logoPicker.appendChild(option);
    });

    selectColor(selectedColor);
}


function selectColor(color) {
    selectedColor = color;

    const colorInput = document.getElementById('partyColor');

    if (colorInput) {
        colorInput.value = color;
    }

    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.toggle(
            'selected',
            swatch.dataset.color === color.toLowerCase()
        );
    });
}


function ClearLogoSelection() {
    document.querySelectorAll('.logo-option').forEach(option => {
        option.classList.remove('selected');
    });

    selectedLogoId = null;
}


/* =========================================================
   4. SEAT POSITION CALCULATIONS
========================================================= */

function CalculateSeatsPlacement(
    center,
    seatRadius,
    nOfSeatsPerRow,
    centerPadding,
    betweenSeatsPadding
) {
    seatsArray = [];

    for (let i = 0; i < nOfSeatsPerRow.length; i++) {
        const radius =
            centerPadding +
            seatRadius +
            i * (2 * seatRadius + betweenSeatsPadding);

        const seatsInRow = nOfSeatsPerRow[i];

        for (let j = 0; j < seatsInRow; j++) {
            const angle = (j / (seatsInRow - 1)) * Math.PI;

            const x = center.x - radius * Math.cos(angle);
            const y = center.y - radius * Math.sin(angle);

            seatsArray.push({
                x,
                y,
                r: seatRadius,
                color: emptySeatColor
            });
        }
    }
}


function SortSeatsByAngle(seats, center) {
    return seats.sort((a, b) => {
        const angleA = Math.atan2(
            center.y - a.y,
            a.x - center.x
        );

        const angleB = Math.atan2(
            center.y - b.y,
            b.x - center.x
        );

        // Primary sorting: angle
        if (Math.abs(angleA - angleB) > 0.000001) {
            return angleB - angleA;
        }

        // Secondary sorting: distance from center
        const distanceA = Math.hypot(
            a.x - center.x,
            a.y - center.y
        );

        const distanceB = Math.hypot(
            b.x - center.x,
            b.y - center.y
        );

        // Left side: farther seats first
        if (angleA > Math.PI / 2) {
            return distanceB - distanceA;
        }

        // Right side: closer seats first
        return distanceA - distanceB;
    });
}


/* =========================================================
   5. CANVAS DRAWING
========================================================= */

function UpdateSeatsColors() {
    let seatIndex = 0;

    parties.forEach(party => {
        for (let i = 0; i < party.seats; i++) {
            if (seatIndex >= seatsArray.length) break;

            seatsArray[seatIndex].color = party.color;
            seatIndex++;
        }
    });

    // Reset unallocated seats
    for (let i = seatIndex; i < seatsArray.length; i++) {
        seatsArray[i].color = emptySeatColor;
    }

    DrawSeats(seatsArray);
}


function DrawSeats(seats) {
    const canvas = document.getElementById('parliamentCanvas');
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    DrawParliamentCenter(ctx);

    seats.forEach(seat => {
        ctx.beginPath();
        ctx.arc(seat.x, seat.y, seat.r, 0, Math.PI * 2);
        ctx.fillStyle = seat.color;
        ctx.fill();
    });
}


function DrawSeatsNumbered(seats) {
    const canvas = document.getElementById('parliamentCanvas');
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    DrawParliamentCenter(ctx);

    seats.forEach((seat, index) => {
        // Draw seat
        ctx.beginPath();
        ctx.arc(seat.x, seat.y, seat.r, 0, Math.PI * 2);
        ctx.fillStyle = seat.color;
        ctx.fill();

        // Draw seat number
        ctx.fillStyle = '#ff0000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        ctx.fillText(index, seat.x, seat.y + 5);
    });
}


function DrawParliamentCenter(ctx) {
    const centerX = center.x;
    const centerY = center.y + 20;

    ctx.save();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ecdcab';

    // Total number of seats
    ctx.font = 'bold 32px Oswald';
    ctx.fillText(seatsArray.length, centerX, centerY - 15);

    // Website address
    ctx.font = '15px OldStandardTT';
    ctx.fillText(
        'thispenguincanfly.github.io/suzerainparliament',
        centerX,
        centerY + 20
    );

    ctx.restore();
}


/* =========================================================
   6. PARTY MANAGEMENT
========================================================= */

function AddParty(event) {
    event.preventDefault();

    const name = document.getElementById('partyName').value.trim();
    const seats = Number(document.getElementById('partySeats').value);
    const color = selectedColor;

    // Validate party information
    if (!name || !Number.isInteger(seats) || seats < 1) {
        alert('Please enter a valid party name and number of seats.');
        return;
    }

    // Check available seats
    const allocatedSeats = parties.reduce(
        (sum, party) => sum + party.seats,
        0
    );

    if (allocatedSeats + seats > seatsArray.length) {
        alert('Not enough available seats!');
        return;
    }

    // Find selected logo
    const selectedLogo =
        AVAILABLE_LOGOS.find(logo => logo.id === selectedLogoId) ||
        uploadedLogos.find(logo => logo.id === selectedLogoId);

    // Add party
    parties.push({
        name,
        seats,
        color,
        logo: selectedLogo ? selectedLogo.src : null,
        logoId: selectedLogoId
    });

    UpdateSeatsColors();
    UpdatePartiesDisplay();

    // Reset form
    document.getElementById('addPartyForm').reset();

    ClearLogoSelection();
    selectColor('#667eea');
}


function UpdatePartiesDisplay() {
    const display = document.getElementById('partiesDisplay');

    display.innerHTML = '';

    if (parties.length === 0) {
        display.innerHTML =
            '<div class="empty-state">No parties added yet</div>';
        return;
    }

    parties.forEach((party, index) => {
        const partyElement = document.createElement('div');
        partyElement.className = 'party-list-item';
        partyElement.dataset.index = index;

        // Left side
        const leftElement = document.createElement('div');
        leftElement.className = 'party-left';

        // Party icon
        const iconElement = document.createElement('div');
        iconElement.className = 'party-icon';
        iconElement.style.backgroundColor = party.color;

        const logoSrc =
            party.logo ||
            (party.logoId && logoImages[party.logoId]
                ? logoImages[party.logoId].src
                : null);

        if (logoSrc) {
            const logoElement = document.createElement('img');
            logoElement.src = logoSrc;
            logoElement.alt = party.name;

            iconElement.appendChild(logoElement);
        }

        // Party name
        const nameElement = document.createElement('div');
        nameElement.className = 'party-name-display';
        nameElement.textContent = party.name;

        leftElement.append(iconElement, nameElement);

        // Right side
        const rightElement = document.createElement('div');

        const seatsElement = document.createElement('span');
        seatsElement.className = 'party-seats-display';
        seatsElement.textContent = party.seats;

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn btn-danger delete-btn';
        deleteButton.textContent = '×';

        deleteButton.addEventListener('pointerdown', event => {
            event.stopPropagation();
        });

        deleteButton.addEventListener('click', event => {
            event.stopPropagation();
            removeParty(index);
        });

        rightElement.append(seatsElement, deleteButton);

        partyElement.append(leftElement, rightElement);
        display.appendChild(partyElement);
    });

    enableTouchReorder();
}


function removeParty(index) {
    parties.splice(index, 1);

    UpdatePartiesDisplay();
    UpdateSeatsColors();
}


function moveParty(fromIndex, toIndex) {
    if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= parties.length ||
        toIndex >= parties.length
    ) {
        return;
    }

    const movedParty = parties.splice(fromIndex, 1)[0];
    parties.splice(toIndex, 0, movedParty);

    UpdatePartiesDisplay();
    UpdateSeatsColors();
}


/* =========================================================
   7. PARTY DRAG & DROP
========================================================= */

function enableTouchReorder() {
    document.querySelectorAll('.party-list-item').forEach(item => {
        item.addEventListener('pointerdown', onPointerDown);
    });
}


function onPointerDown(event) {
    if (event.target.closest('.delete-btn')) return;

    draggedEl = event.currentTarget;
    startIndex = Number(draggedEl.dataset.index);
    pointerStartY = event.clientY;

    draggedEl.classList.add('dragging');
    draggedEl.setPointerCapture(event.pointerId);

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
}


function onPointerMove(event) {
    if (!draggedEl) return;

    const offsetY = event.clientY - pointerStartY;

    draggedEl.style.transform = `translateY(${offsetY}px)`;

    const items = document.querySelectorAll('.party-list-item');

    items.forEach(item => {
        if (item === draggedEl) return;

        const rect = item.getBoundingClientRect();

        const isTarget =
            event.clientY > rect.top &&
            event.clientY < rect.bottom;

        item.classList.toggle('drop-target', isTarget);
    });
}


function onPointerUp() {
    if (!draggedEl) return;

    const items = document.querySelectorAll('.party-list-item');

    let targetIndex = startIndex;

    items.forEach(item => {
        if (item.classList.contains('drop-target')) {
            targetIndex = Number(item.dataset.index);
        }

        item.classList.remove('drop-target');
    });

    draggedEl.style.transform = '';
    draggedEl.classList.remove('dragging');

    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);

    const fromIndex = startIndex;

    draggedEl = null;
    startIndex = null;
    pointerStartY = null;

    if (targetIndex !== fromIndex) {
        moveParty(fromIndex, targetIndex);
    }
}


/* =========================================================
   8. ADVANCED MODE
========================================================= */

function InitializeAdvancedMode() {
    const toggleButton = document.getElementById('advancedModeToggle');
    const panel = document.getElementById('advancedModePanel');

    toggleButton.addEventListener('click', () => {
        panel.hidden = !panel.hidden;

        toggleButton.textContent = panel.hidden
            ? 'Advanced Mode ⚙'
            : 'Close Advanced Mode ✕';
    });

    document.getElementById('applyAdvancedSettings')
        .addEventListener('click', ApplyAdvancedSettings);

    document.getElementById('resetAdvancedSettings')
        .addEventListener('click', ResetAdvancedSettings);

    document.getElementById('usCongressSettings')
        .addEventListener('click', ApplyUSCongressSettings);

    document.getElementById('settings100Seats')
        .addEventListener('click', Apply100SeatsSettings);
}

function ApplyUSCongressSettings() {
    nOfSeatsPerRow = [16, 20, 25, 29, 35, 39, 45, 49, 55, 59, 63];
    seatRadius = 8;
    centerPadding = 100;
    betweenSeatsPadding = 5;

    UpdateAdvancedSettingsInputs();
    RecalculateParliament();
}

function Apply100SeatsSettings() {
    nOfSeatsPerRow = [12, 14, 16, 17, 19, 22];
    seatRadius = 15;
    centerPadding = 100;
    betweenSeatsPadding = 10;

    UpdateAdvancedSettingsInputs();
    RecalculateParliament();
}

function ApplyAdvancedSettings() {
    const rowsInput = document.getElementById('seatsPerRowInput').value;

    const radiusInput = Number(
        document.getElementById('seatRadiusInput').value
    );

    const centerInput = Number(
        document.getElementById('centerPaddingInput').value
    );

    const spacingInput = Number(
        document.getElementById('betweenSeatsPaddingInput').value
    );

    // Parse row seat counts
    const newRows = rowsInput
        .split(',')
        .map(value => Number(value.trim()));

    // Validate row seat counts
    if (
        !rowsInput.trim() ||
        newRows.some(value => !Number.isInteger(value) || value < 2)
    ) {
        alert(
            'Please enter valid seat counts for every row. Each row must have at least 2 seats.'
        );
        return;
    }

    // Validate dimensions
    if (
        !Number.isFinite(radiusInput) ||
        radiusInput <= 0 ||
        !Number.isFinite(centerInput) ||
        centerInput < 0 ||
        !Number.isFinite(spacingInput) ||
        spacingInput < 0
    ) {
        alert('Please enter valid values for all parliament settings.');
        return;
    }

    // Check existing party allocations
    const allocatedSeats = parties.reduce(
        (sum, party) => sum + party.seats,
        0
    );

    const newTotalSeats = newRows.reduce(
        (sum, seats) => sum + seats,
        0
    );

    if (allocatedSeats > newTotalSeats) {
        alert(
            `Your parties currently occupy ${allocatedSeats} seats, but the new parliament only has ${newTotalSeats} seats. Please increase the total number of seats first.`
        );
        return;
    }

    // Apply settings
    nOfSeatsPerRow = newRows;
    seatRadius = radiusInput;
    centerPadding = centerInput;
    betweenSeatsPadding = spacingInput;

    RecalculateParliament();
}

function ResetAdvancedSettings() {
    nOfSeatsPerRow = [
        ...DEFAULT_PARLIAMENT_SETTINGS.nOfSeatsPerRow
    ];

    seatRadius = DEFAULT_PARLIAMENT_SETTINGS.seatRadius;
    centerPadding = DEFAULT_PARLIAMENT_SETTINGS.centerPadding;
    betweenSeatsPadding =
        DEFAULT_PARLIAMENT_SETTINGS.betweenSeatsPadding;

    UpdateAdvancedSettingsInputs();
    RecalculateParliament();
}

function UpdateAdvancedSettingsInputs() {
    document.getElementById('seatsPerRowInput').value =
        nOfSeatsPerRow.join(', ');

    document.getElementById('seatRadiusInput').value = seatRadius;
    document.getElementById('centerPaddingInput').value = centerPadding;
    document.getElementById('betweenSeatsPaddingInput').value =
        betweenSeatsPadding;
}

function RecalculateParliament() {
    CalculateSeatsPlacement(
        center,
        seatRadius,
        nOfSeatsPerRow,
        centerPadding,
        betweenSeatsPadding
    );

    seatsArray = SortSeatsByAngle(seatsArray, center);

    UpdateSeatsColors();
}


/* =========================================================
   9. CUSTOM SVG UPLOAD
========================================================= */

function InitializeCustomSvgUpload() {
    const uploadInput = document.getElementById('customSvgUpload');

    uploadInput.addEventListener('change', async event => {
        const files = Array.from(event.target.files);

        for (const file of files) {
            if (!file.name.toLowerCase().endsWith('.svg')) {
                alert(`${file.name} is not an SVG file.`);
                continue;
            }

            if (file.size > 1024 * 1024) {
                alert(`${file.name} is too large. Maximum size is 1 MB.`);
                continue;
            }

            try {
                const svgData = await ReadAndSanitizeSvg(file);
                AddUploadedLogo(file.name, svgData);
            } catch (error) {
                alert(
                    `Could not load ${file.name}. Please check that it is a valid SVG.`
                );
            }
        }

        uploadInput.value = '';
    });
}


function ReadAndSanitizeSvg(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            try {
                const parser = new DOMParser();

                const svgDocument = parser.parseFromString(
                    reader.result,
                    'image/svg+xml'
                );

                const svg = svgDocument.documentElement;

                if (
                    svg.tagName.toLowerCase() !== 'svg' ||
                    svgDocument.querySelector('parsererror')
                ) {
                    reject(new Error('Invalid SVG'));
                    return;
                }

                // Remove potentially dangerous elements
                const forbiddenElements = [
                    'script',
                    'foreignObject',
                    'iframe',
                    'object',
                    'embed',
                    'audio',
                    'video',
                    'style'
                ];

                forbiddenElements.forEach(tag => {
                    svgDocument.querySelectorAll(tag).forEach(element => {
                        element.remove();
                    });
                });

                // Remove unsafe attributes
                svgDocument.querySelectorAll('*').forEach(element => {
                    Array.from(element.attributes).forEach(attribute => {
                        const name = attribute.name.toLowerCase();
                        const value = attribute.value.trim();

                        // Remove event handlers
                        if (name.startsWith('on')) {
                            element.removeAttribute(attribute.name);
                            return;
                        }

                        // Allow only local SVG references
                        if (
                            (name === 'href' || name === 'xlink:href') &&
                            value &&
                            !value.startsWith('#')
                        ) {
                            element.removeAttribute(attribute.name);
                        }

                        // Remove potentially unsafe CSS references
                        if (
                            value.toLowerCase().includes('javascript:') ||
                            value.toLowerCase().includes('url(') ||
                            value.toLowerCase().includes('@import')
                        ) {
                            element.removeAttribute(attribute.name);
                        }
                    });
                });

                // Add viewBox if missing
                if (!svg.hasAttribute('viewBox')) {
                    const width = parseFloat(svg.getAttribute('width'));
                    const height = parseFloat(svg.getAttribute('height'));

                    if (width > 0 && height > 0) {
                        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
                    }
                }

                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '100%');

                const serializer = new XMLSerializer();
                const cleanedSvg = serializer.serializeToString(svg);

                const encodedSvg = btoa(
                    unescape(encodeURIComponent(cleanedSvg))
                );

                resolve(`data:image/svg+xml;base64,${encodedSvg}`);

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('File reading failed'));
        };

        reader.readAsText(file);
    });
}


function AddUploadedLogo(fileName, svgData) {
    const logoId =
        `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const uploadedLogo = {
        id: logoId,
        name: fileName.replace(/\.svg$/i, ''),
        src: svgData
    };

    uploadedLogos.push(uploadedLogo);

    const logoPicker = document.getElementById('logoPicker');

    const option = document.createElement('div');
    option.className = 'logo-option';
    option.dataset.logoId = logoId;
    option.title = uploadedLogo.name;

    const image = document.createElement('img');
    image.src = svgData;
    image.alt = uploadedLogo.name;

    option.appendChild(image);

    option.addEventListener('click', () => {
        const isSelected = option.classList.contains('selected');

        ClearLogoSelection();

        if (!isSelected) {
            option.classList.add('selected');
            selectedLogoId = logoId;
        }
    });

    logoPicker.appendChild(option);
}


/* =========================================================
   10. PARLIAMENT TITLE
========================================================= */

function InitializeParliamentTitle() {
    const titleInput = document.getElementById('parliamentTitle');
    const displayTitle = document.getElementById('displayTitle');

    function UpdateTitle() {
        displayTitle.textContent =
            titleInput.value.trim() || 'Parliament';
    }

    titleInput.addEventListener('input', UpdateTitle);

    UpdateTitle();
}


/* =========================================================
   11. APPLICATION INITIALIZATION
========================================================= */

function InitializeApp() {
    // Initialize pickers
    InitializePartyPickers();
    InitializeCustomSvgUpload();

    // Initialize Advanced Mode
    InitializeAdvancedMode();

    // Initialize parliament title
    InitializeParliamentTitle();

    // Register party form
    const form = document.getElementById('addPartyForm');
    form.addEventListener('submit', AddParty);

    // Calculate initial seat positions
    RecalculateParliament();

    // Initial party list
    UpdatePartiesDisplay();

    // Initialize PNG export
    document.getElementById('saveBtn')
        .addEventListener('click', handleSaveImage);
}


// Start application after the page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', InitializeApp);
} else {
    InitializeApp();
}


/* =========================================================
   12. PNG EXPORT
========================================================= */

async function handleSaveImage() {
    const sourceCanvas = document.getElementById('parliamentCanvas');

    // Export dimensions
    const scale = 2;
    const exportWidth = sourceCanvas.width * scale;
    const exportHeight = sourceCanvas.height * scale;

    const titleHeight = 130;
    const legendStartY = titleHeight + exportHeight + 30;
    const legendRowHeight = 65;
    const legendHeight = parties.length * legendRowHeight + 30;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = legendStartY + legendHeight;

    const ctx = exportCanvas.getContext('2d');

    // Wait for webpage fonts to load
    await document.fonts.ready;

    // Background
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Parliament title
    const titleElement = document.getElementById('displayTitle');
    const titleStyle = window.getComputedStyle(titleElement);

    ctx.fillStyle = titleStyle.color;
    ctx.font = `normal 64px ${titleStyle.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(
        titleElement.textContent,
        exportWidth / 2,
        titleHeight / 2,
        exportWidth - 40
    );

    // Draw existing parliament canvas
    ctx.drawImage(
        sourceCanvas,
        0,
        titleHeight,
        exportWidth,
        exportHeight
    );

    // Load party logos
    const loadedLogos = await Promise.all(
        parties.map(party => {
            if (!party.logo) return Promise.resolve(null);

            return new Promise(resolve => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => resolve(null);
                image.src = party.logo;
            });
        })
    );

    // Party legend - one party per row
    const legendX = 40;
    const iconSize = 42;
    const textX = legendX + 60;
    const seatsX = exportWidth - 40;

    parties.forEach((party, index) => {
        const y = legendStartY + 15 + index * legendRowHeight;

        // Party color circle
        ctx.beginPath();
        ctx.arc(
            legendX + iconSize / 2,
            y + iconSize / 2,
            iconSize / 2 + 10,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = party.color;
        ctx.fill();

        // Party logo
        const logo = loadedLogos[index];

        if (logo) {
            ctx.save();

            ctx.beginPath();
            ctx.arc(
                legendX + iconSize / 2,
                y + iconSize / 2,
                iconSize / 2 + 5,
                0,
                Math.PI * 2
            );
            ctx.clip();

            ctx.drawImage(
                logo,
                legendX,
                y,
                iconSize,
                iconSize
            );

            ctx.restore();
        }

        // Party name
        ctx.fillStyle = '#ecdcab';
        ctx.font = '40px OldStandardTT';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        ctx.fillText(
            party.name,
            textX,
            y + iconSize / 2,
            exportWidth - textX - 180
        );

        // Seat count aligned to the right
        ctx.fillStyle = '#B0B0B0';
        ctx.font = '40px OldStandardTT';
        ctx.textAlign = 'right';

        ctx.fillText(
            `${party.seats} seats`,
            seatsX,
            y + iconSize / 2
        );
    });

    // Download PNG
    const link = document.createElement('a');
    link.download = 'sordland-parliament.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
}