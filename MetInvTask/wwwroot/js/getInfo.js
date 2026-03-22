// Глобальні змінні для симуляції
let simulationTimer = null;
let allEquipmentList = []; // Зберігатимемо всі агрегати для їх перемикання
let currentSelectedEquipmentId = null;



const STATES = ['OFF', 'IDLE', 'RUN', 'WARN', 'ALARM'];



document.addEventListener("DOMContentLoaded", function () {
    const svgContainer = document.querySelector('svg');

    if (!svgContainer) return;

    setupClickableEquipment(svgContainer);

    svgContainer.addEventListener('click', handleEquipmentClick);

    document.getElementById('btn-start').addEventListener('click', startSimulation);
    document.getElementById('btn-stop').addEventListener('click', stopSimulation);

    const apiBtn = document.getElementById('btn-check-api');
    if (apiBtn) {
        apiBtn.addEventListener('click', () => {
            window.open('/api/equipment', '_blank');
        });
    }
});

// 1. Пошук та збереження всіх агрегатів у масив
function setupClickableEquipment(svg) {
    const allElements = svg.querySelectorAll('[id]');

    allElements.forEach(el => {
        if (el.tagName.toLowerCase() === 'text' || el.tagName.toLowerCase() === 'tspan') return;
        if (el.id.startsWith('BG-') || el.id.startsWith('outline')) return;

        let name = el.querySelector('title')?.textContent || el.id;
        let upperName = name.toUpperCase();

        const isEquipment = upperName.includes('KRD') || upperName.includes('KSD') ||
            upperName.includes('KMD') || upperName.includes('KKD') ||
            upperName.includes('PIT') || upperName.includes('GR') ||
            upperName.match(/[KMКМ]-\d+/) || upperName.includes('BUNKER');
        const crusherRegex = /^(KKD|KRD|KMD|KSD)-\d+$/;

        if (isEquipment) {
            el.classList.add('clickable-equipment');
            let type = 'OTHER';

            if (crusherRegex.test(upperName)) {
                type = 'CRUSHER';
            }
            else if (upperName.includes('PIT')) {
                type = 'PIT';
            }
            else if (upperName.match(/[KMКМ]-\d+/)) {
                type = 'CONVEYOR';
            }

            let existingEq = allEquipmentList.find(x => x.name === upperName);

            if (existingEq) {
                existingEq.elements.push(el);
                applyStateVisuals(el, existingEq.state, existingEq.type);
            } else {
                // Якщо немає — створюємо новий агрегат з МАСИВОМ елементів
                let newEq = {
                    elements: [el],
                    name: upperName,
                    type: type,
                    state: 'OFF'
                };
                allEquipmentList.push(newEq);
                applyStateVisuals(el, 'OFF', type);
            }
        }
    });
}

async function fetchEquipmentData() {
    try {
        const response = await fetch('/api/equipment');
        if (!response.ok) return;

        const data = await response.json();

        data.forEach(srvItem => {
            // Знаходимо локальний об'єкт за ID, який прийшов з бази/API
            let eq = allEquipmentList.find(x => x.elements.some(el => el.id === srvItem.id));
            if (eq) {
                changeEquipmentState(eq, srvItem.status);
            }
        });
    } catch (error) {
        console.error("API Error:", error);
    }
}

// 2. Логіка Симуляції
function startSimulation() {
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-stop').disabled = false;

    // Запускаємо всі конвеєри та дробарки в нормальний режим (RUN) для старту потоку
    // ore → conveyor → crusher → conveyor → bunker
    allEquipmentList.forEach(eq => {
        changeEquipmentState(eq, 'RUN');
    });

    // Таймер: кожні 2 секунди випадково змінює стан 2-х агрегатів
    simulationTimer = setInterval(() => {
        for (let i = 0; i < 2; i++) {
            let randomIndex = Math.floor(Math.random() * allEquipmentList.length);
            let eq = allEquipmentList[randomIndex];
            // Логіка переходів: RUN -> WARN -> ALARM -> OFF -> IDLE -> RUN...
            let nextState = getRandomNextState(eq.state);
            changeEquipmentState(eq, nextState);
        }
    }, 2000);
}

function stopSimulation() {
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-stop').disabled = true;
    clearInterval(simulationTimer);
    // Зупиняємо все
    allEquipmentList.forEach(eq => changeEquipmentState(eq, 'OFF'));
}

function getRandomNextState(currentState) {
    // Випадковий вибір наступного стану для імітації "живого" заводу
    const r = Math.random();
    if (currentState === 'RUN') return r > 0.5 ? 'WARN' : 'RUN';
    if (currentState === 'WARN') return r > 0.2 ? 'ALARM' : 'RUN';
    if (currentState === 'ALARM') return 'OFF';
    if (currentState === 'OFF') return 'IDLE';
    if (currentState === 'IDLE') return 'RUN';
    return 'RUN';
}

// Функція зміни статусу (до всіх частин агрегату)
function changeEquipmentState(eq, newState) {
    eq.state = newState;
    // Проходимось по всіх частинах (DOM-вузлах), які належать цьому агрегату
    eq.elements.forEach(el => {
        applyStateVisuals(el, eq.state, eq.type);
        // Якщо хоча б одна з частин зараз виділена кліком - оновлюємо панель
        if (currentSelectedEquipmentId === el.id) {
            refreshPanelData(eq);
        }
    });
}

// Застосування CSS класів залежно від стану
function applyStateVisuals(element, state, type) {
    // Очищаємо всі попередні стани
    element.classList.remove('state-off', 'state-idle', 'state-run', 'state-warn', 'state-alarm', 'conveyor-run', 'conveyor-alarm', 'crusher-anim-run');

    if (type === 'CONVEYOR') {
        if (state === 'RUN' || state === 'IDLE') element.classList.add('conveyor-run');
        else if (state === 'ALARM') element.classList.add('conveyor-alarm');
        else element.classList.add('state-off');
    }
    else {
        // Для дробарок
        element.classList.add(`state-${state.toLowerCase()}`);
        if (type === 'CRUSHER' && state === 'RUN') {
            element.classList.add('crusher-anim-run');
        }
    }
}

// 3. Обробка Кліків (Пошук по масиву elements
function handleEquipmentClick(e) {
    let target = e.target.closest('.clickable-equipment');

    if (!target) { clearSelection(); return; }

    e.stopPropagation();
    currentSelectedEquipmentId = target.id;
    document.querySelectorAll('.active-equipment').forEach(el => el.classList.remove('active-equipment'));
    target.classList.add('active-equipment');

    // Шукаємо агрегат, у якого в масиві elements є наш клікнутий target
    let eqItem = allEquipmentList.find(x => x.elements.includes(target));

    if (eqItem) {
        refreshPanelData(eqItem);
    }
}

function refreshPanelData(eqItem) {
    let html = '';
    let badgeClass = 'bg-secondary';
    let statusText = eqItem.state;

    html += `<li class="list-group-item bg-transparent"><strong>Статус:</strong> <span class="badge ${badgeClass}">${statusText}</span></li>`;

    // Специфічні дані залежно від типу
    if (eqItem.type === 'CRUSHER') {
        let temp = eqItem.state === 'ALARM' ? 95 : (eqItem.state === 'RUN' ? 65 : 30);
        let load = eqItem.state === 'ALARM' ? 120 : (eqItem.state === 'RUN' ? 80 : 0);
        html += `<li class="list-group-item bg-transparent"><strong>Температура:</strong> ${temp} °C</li>`;
        html += `<li class="list-group-item bg-transparent"><strong>Навантаження:</strong> ${load} %</li>`;
    }
    else if (eqItem.type === 'CONVEYOR') {
        let speed = (eqItem.state === 'RUN' || eqItem.state === 'IDLE') ? '2.5 м/с' : '0 м/с';
        html += `<li class="list-group-item bg-transparent"><strong>Швидкість:</strong> ${speed}</li>`;
    }
    renderPanel(eqItem.name, html);
}

function renderPanel(title, listHtml) {
    document.getElementById('default-message').style.display = 'none';
    document.getElementById('equipment-data').style.display = 'block';
    document.getElementById('val-equipment').textContent = title;
    document.getElementById('dynamic-parameters').innerHTML = listHtml;
}

function clearSelection() {
    currentSelectedEquipmentId = null;
    document.querySelectorAll('.active-equipment').forEach(el => el.classList.remove('active-equipment'));
    document.getElementById('default-message').style.display = 'block';
    document.getElementById('equipment-data').style.display = 'none';
}

