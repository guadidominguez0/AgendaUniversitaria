const academicPeriods = [
    { id: 1, name: '1° Periodo', startTime: '14:00', endTime: '14:40' },
    { id: 2, name: '2° Periodo', startTime: '14:40', endTime: '15:20' },
    { id: 3, name: '3° Periodo', startTime: '15:35', endTime: '16:15' },
    { id: 4, name: '4° Periodo', startTime: '16:15', endTime: '16:55' },
    { id: 5, name: '5° Periodo', startTime: '16:55', endTime: '17:35' },
    { id: 6, name: '6° Periodo', startTime: '17:50', endTime: '18:30' },
    { id: 7, name: '7° Periodo', startTime: '18:30', endTime: '19:10' },
    { id: 8, name: '8° Periodo', startTime: '19:10', endTime: '19:50' },
    { id: 9, name: '9° Periodo', startTime: '19:50', endTime: '20:30' }
];
const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

let scheduleData = JSON.parse(localStorage.getItem('scheduleData')) || [];
let attendanceData = JSON.parse(localStorage.getItem('attendanceData')) || {};
let currentSelectedSubject = '';
let editSubjectId = null;
let pendingDayHourList = [];

document.addEventListener('DOMContentLoaded', function() {
    populatePeriodOptions();
    updateColorPreview();
    showTab('agenda');
    renderSemesterSchedule();
    renderScheduleGrid();
    updateAttendanceDropdown();
    renderAttendanceList();
    renderPendingDayHourList();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});

// Toggle add subject form
function toggleAddSubjectForm() {
    const form = document.getElementById('addSubjectForm');
    const btn = document.getElementById('showAddSubjectBtn');
    form.style.display = (form.style.display === "none" || !form.style.display) ? "block" : "none";
    if (form.style.display === "block") {
        btn.textContent = "Ocultar Formulario";
        btn.classList.add("ocultar");
    } else {
        btn.textContent = "Agregar Nueva Materia";
        btn.classList.remove("ocultar");
    }
}

function populatePeriodOptions() {
    const startSelect = document.getElementById('addStartPeriod');
    const endSelect = document.getElementById('addEndPeriod');
    startSelect.innerHTML = '<option value="">Selecciona período inicial</option>' +
        academicPeriods.map(p => `<option value="${p.id}">${p.name} (${p.startTime}-${p.endTime})</option>`).join('');
    endSelect.innerHTML = '<option value="">Selecciona período final</option>' +
        academicPeriods.map(p => `<option value="${p.id}">${p.name} (${p.startTime}-${p.endTime})</option>`).join('');
}
function updateEndPeriodOptions(startId='addStartPeriod',endId='addEndPeriod') {
    const startVal = Number(document.getElementById(startId).value);
    const endSelect = document.getElementById(endId);
    endSelect.innerHTML = '<option value="">Selecciona período final</option>' +
        academicPeriods
            .filter(p => p.id >= startVal)
            .map(p => `<option value="${p.id}">${p.name} (${p.startTime}-${p.endTime})</option>`)
            .join('');
}

function addDayHourToMateria() {
    const day = parseInt(document.getElementById('addDayOfWeek').value, 10);
    const startPeriod = parseInt(document.getElementById('addStartPeriod').value, 10);
    const endPeriod = parseInt(document.getElementById('addEndPeriod').value, 10);

    if (!day || !startPeriod || !endPeriod || startPeriod > endPeriod) {
        showNotification('Selecciona día y periodos válidos.', 'error');
        return;
    }
    if (pendingDayHourList.some(e => e.day === day && e.startPeriod === startPeriod && e.endPeriod === endPeriod)) {
        showNotification('Ya añadiste este día y horario para esta materia.', 'error');
        return;
    }
    if (checkOverlapWithSchedule(day, startPeriod, endPeriod)) {
        showNotification('Ya hay una materia asignada en ese día y horario.', 'error');
        return;
    }
    pendingDayHourList.push({day, startPeriod, endPeriod});
    renderPendingDayHourList();
}

function renderPendingDayHourList() {
    const container = document.getElementById('pendingDayHourList');
    if (!pendingDayHourList.length) {
        container.innerHTML = '<div style="color:var(--text-medium);font-size:0.95em;">No hay días/horarios añadidos aún.</div>';
        return;
    }
    container.innerHTML = '<ul style="margin:0 0 10px 0;padding-left:18px;">' +
        pendingDayHourList.map((e,idx) => {
            const ps = academicPeriods.find(p=>p.id===e.startPeriod);
            const pe = academicPeriods.find(p=>p.id===e.endPeriod);
            return `<li>
                ${weekdays[e.day-1]}: ${ps.startTime} - ${pe.endTime}
                <button style="margin-left:8px;font-size:0.8em;padding:2px 8px;" onclick="removePendingDayHour(${idx})">Eliminar</button>
            </li>`;
        }).join('') +
        '</ul>';
}
function removePendingDayHour(idx) {
    pendingDayHourList.splice(idx,1);
    renderPendingDayHourList();
}

function checkOverlapWithSchedule(day, startPeriod, endPeriod, excludeSubjectId=null) {
    return scheduleData.some(s =>
        (!excludeSubjectId || s.id !== excludeSubjectId) &&
        s.day === day &&
        ((s.startPeriod <= endPeriod && s.endPeriod >= startPeriod))
    );
}

function addOrUpdateSubject() {
    const name = document.getElementById('subjectName').value.trim();
    const modality = document.getElementById('modality').value;
    const colorTheme = document.getElementById('colorTheme').value;
    const professorName = document.getElementById('professorName').value.trim();
    const professorEmail = document.getElementById('professorEmail').value.trim();
    const totalClasses = document.getElementById('totalClasses').value ? Number(document.getElementById('totalClasses').value) : null;
    const maxAbsencePercentage = document.getElementById('maxAbsencePercentage').value ? Number(document.getElementById('maxAbsencePercentage').value) : null;

    if (!name || !pendingDayHourList.length) {
        showNotification('Debes completar nombre y al menos un día/horario.', 'error');
        return;
    }

    if (editSubjectId !== null) {
        scheduleData = scheduleData.filter(s => s.id !== editSubjectId && !(s.name === name && s.professorEmail === professorEmail));
        editSubjectId = null;
        document.getElementById('addSubjectBtn').textContent = "Agregar Materia";
    }

    for (const {day, startPeriod, endPeriod} of pendingDayHourList) {
        if (checkOverlapWithSchedule(day, startPeriod, endPeriod)) {
            showNotification(`No se puede asignar ${weekdays[day-1]} ${academicPeriods.find(p=>p.id===startPeriod).startTime}-${academicPeriods.find(p=>p.id===endPeriod).endTime}: Ya existe una materia en ese horario.`, 'error');
            return;
        }
    }

    pendingDayHourList.forEach(({day, startPeriod, endPeriod}) => {
        scheduleData.push({
            id: Date.now() + Math.random(),
            name,
            day,
            startPeriod,
            endPeriod,
            modality,
            colorTheme,
            professorName,
            professorEmail,
            totalClasses,
            maxAbsencePercentage
        });
    });

    showNotification('Materia agregada correctamente.', 'success');
    saveData();
    renderScheduleGrid();
    renderSemesterSchedule();
    updateAttendanceDropdown();
    clearSubjectForm();
}

function clearSubjectForm() {
    document.getElementById('subjectName').value = '';
    document.getElementById('addDayOfWeek').selectedIndex = 0;
    document.getElementById('addStartPeriod').selectedIndex = 0;
    updateEndPeriodOptions('addStartPeriod','addEndPeriod');
    document.getElementById('addEndPeriod').selectedIndex = 0;
    document.getElementById('modality').selectedIndex = 0;
    document.getElementById('colorTheme').selectedIndex = 1;
    updateColorPreview();
    document.getElementById('professorName').value = '';
    document.getElementById('professorEmail').value = '';
    document.getElementById('totalClasses').value = '';
    document.getElementById('maxAbsencePercentage').value = '';
    pendingDayHourList = [];
    renderPendingDayHourList();
    editSubjectId = null;
    document.getElementById('addSubjectBtn').textContent = "Agregar Materia";
    document.getElementById('addSubjectForm').style.display = "none";
    const btn = document.getElementById('showAddSubjectBtn');
    btn.textContent = "Agregar Nueva Materia";
    btn.classList.remove("ocultar");
}

// Agrupación de materias para la grilla de gestión (una tarjeta por materia+profesor)
function getGroupedSubjects() {
    const grouped = {};
    for (const s of scheduleData) {
        const key = s.name + '||' + s.professorEmail;
        if (!grouped[key]) {
            grouped[key] = {
                ...s,
                schedules: []
            };
        }
        grouped[key].schedules.push({
            day: s.day,
            startPeriod: s.startPeriod,
            endPeriod: s.endPeriod
        });
    }
    return Object.values(grouped);
}

function renderScheduleGrid() {
    const container = document.getElementById('scheduleGrid');
    if (scheduleData.length === 0) {
        container.innerHTML = '<div class="no-data">No hay materias agregadas</div>';
        return;
    }
    const grouped = getGroupedSubjects();
    container.innerHTML = grouped.map(subject => {
        let horarios = subject.schedules.map(sch => {
            const ps = academicPeriods.find(p=>p.id===sch.startPeriod);
            const pe = academicPeriods.find(p=>p.id===sch.endPeriod);
            const periodLabel = sch.startPeriod === sch.endPeriod
                ? `${weekdays[sch.day-1]}: ${ps.name} (${ps.startTime}-${ps.endTime})`
                : `${weekdays[sch.day-1]}: ${ps.name} - ${pe.name} (${ps.startTime}-${pe.endTime})`;
            return `<li>${periodLabel}</li>`;
        }).join('');
        let classInfo = '';
        if (subject.totalClasses && subject.maxAbsencePercentage) {
            classInfo = `<div class="subject-info">
                <span>Horas cátedra: ${subject.totalClasses} | % asistencia: ${subject.maxAbsencePercentage}</span>
            </div>`;
        }
        return `<div class="schedule-item ${subject.modality}" data-color="${subject.colorTheme}">
            <h3>${subject.name}</h3>
            <ul style="margin:8px 0 12px 18px; padding:0;">${horarios}</ul>
            <span class="modality-badge ${subject.modality}">${subject.modality === 'virtual' ? 'Virtual' : 'Presencial'}</span>
            <p>${subject.professorName}</p>
            <p>${subject.professorEmail}</p>
            ${classInfo}
            <button class="edit-btn" onclick="editSubject(${subject.id})" style="background:#1976d2;margin-top:6px;margin-right:8px;">Editar</button>
            <button class="delete-btn" onclick="deleteSubject(${subject.id})">Eliminar</button>
        </div>`;
    }).join('');
}

function editSubject(id) {
    const subject = scheduleData.find(s => s.id === id);
    if (!subject) return;
    document.getElementById('subjectName').value = subject.name;
    document.getElementById('modality').value = subject.modality;
    document.getElementById('colorTheme').value = subject.colorTheme;
    updateColorPreview();
    document.getElementById('professorName').value = subject.professorName;
    document.getElementById('professorEmail').value = subject.professorEmail;
    document.getElementById('totalClasses').value = subject.totalClasses || '';
    document.getElementById('maxAbsencePercentage').value = subject.maxAbsencePercentage || '';
    pendingDayHourList = scheduleData
        .filter(s => s.name === subject.name && s.professorEmail === subject.professorEmail)
        .map(s => ({
            day: s.day,
            startPeriod: s.startPeriod,
            endPeriod: s.endPeriod
        }));
    renderPendingDayHourList();
    editSubjectId = id;
    document.getElementById('addSubjectBtn').textContent = "Actualizar Materia";
    document.getElementById('addSubjectForm').style.display = "block";
    const btn = document.getElementById('showAddSubjectBtn');
    btn.textContent = "Ocultar Formulario";
    btn.classList.add("ocultar");
    showTab('schedule');
}

function deleteSubject(id) {
    if (confirm('¿Eliminar esta materia?')) {
        const subject = scheduleData.find(s=>s.id===id);
        // Elimina todos los horarios de esa materia+profesor
        scheduleData = scheduleData.filter(s => !(s.name === subject.name && s.professorEmail === subject.professorEmail));
        if (attendanceData[subject.name]) delete attendanceData[subject.name];
        saveData();
        renderScheduleGrid();
        renderSemesterSchedule();
        updateAttendanceDropdown();
        renderAttendanceList();
        showNotification('Materia eliminada correctamente.', 'success');
    }
}

function saveData() {
    localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
    localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
}

// AGENDA SEMANAL: muestra la materia en cada período asignado
function renderSemesterSchedule() {
    const container = document.getElementById('semesterScheduleContainer');
    if (scheduleData.length === 0) {
        container.innerHTML = '<div class="no-data">No hay materias para mostrar en el horario<br><small>Comienza agregando tus materias en la pestaña "Materias"</small></div>';
        return;
    }
    let scheduleHTML = '<div class="semester-schedule">';
    scheduleHTML += '<div class="time-header">Hora</div>';
    weekdays.forEach(day => {
        scheduleHTML += `<div class="day-header">${day}</div>`;
    });

    academicPeriods.forEach(period => {
        scheduleHTML += `<div class="time-slot">
            <small>${period.startTime} - ${period.endTime}</small>
        </div>`;
        for (let day = 1; day <= 5; day++) {
            // Mostrar todas las materias que ocupan este día y periodo
            const daySubjects = scheduleData.filter(subject => {
                return subject.day === day && period.id >= subject.startPeriod && period.id <= subject.endPeriod;
            });
            scheduleHTML += '<div class="day-slot">';
            daySubjects.forEach(subject => {
                scheduleHTML += `<div class="subject-block ${subject.modality}" data-color="${subject.colorTheme}" 
                    title="${subject.name} - ${subject.professorName}">
                        <div class="subject-name">${subject.name}</div>
                        <div class="subject-details">${subject.modality === 'virtual' ? 'Virtual' : 'Presencial'}</div>
                    </div>`;
            });
            scheduleHTML += '</div>';
        }
    });
    scheduleHTML += '</div>';
    container.innerHTML = scheduleHTML;
}

// Color preview materia
function updateColorPreview() {
    const colorTheme = document.getElementById('colorTheme').value;
    const preview = document.getElementById('selectedColorPreview');
    const colorName = document.getElementById('colorName');
    preview.className = `selected-color-preview ${colorTheme}`;
    colorName.textContent = document.getElementById('colorTheme').selectedOptions[0].textContent;
}

// INASISTENCIAS
function updateAttendanceDropdown() {
    const select = document.getElementById('attendanceSubject');
    const uniqueSubjects = [...new Set(scheduleData.map(s => s.name))];
    select.innerHTML = '<option value="">Selecciona una materia</option>' + 
        uniqueSubjects.map(name => `<option value="${name}">${name}</option>`).join('');
}
function openAbsenceModal() {
    const subjectName = document.getElementById('attendanceSubject').value;
    if (!subjectName) {
        showNotification('Por favor selecciona una materia', 'error');
        return;
    }
    currentSelectedSubject = subjectName;
    document.getElementById('absenceDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('absenceReason').value = '';
    document.getElementById('absenceModal').classList.add('active');
}
function closeAbsenceModal() {
    document.getElementById('absenceModal').classList.remove('active');
    currentSelectedSubject = '';
}
function addAbsence() {
    const date = document.getElementById('absenceDate').value;
    const reason = document.getElementById('absenceReason').value.trim();
    if (!date) {
        showNotification('Por favor selecciona una fecha', 'error');
        return;
    }
    if (!attendanceData[currentSelectedSubject]) {
        attendanceData[currentSelectedSubject] = [];
    }
    const existingAbsence = attendanceData[currentSelectedSubject].find(abs => abs.date === date);
    if (existingAbsence) {
        showNotification('Ya existe una inasistencia para esta fecha', 'error');
        return;
    }
    attendanceData[currentSelectedSubject].push({
        date: date,
        reason: reason || 'Sin motivo especificado'
    });
    saveData();
    renderAttendanceList();
    closeAbsenceModal();
    showNotification(`Inasistencia agregada a ${currentSelectedSubject}`, 'success');
}
function removeAbsence(subject, date) {
    if (confirm('¿Estás seguro de eliminar esta inasistencia?')) {
        attendanceData[subject] = attendanceData[subject].filter(abs => abs.date !== date);
        saveData();
        renderAttendanceList();
        showNotification('Inasistencia eliminada correctamente', 'success');
    }
}
function calculateAbsenceStats(subject) {
    const subjectData = scheduleData.find(s => s.name === subject.name);
    const absences = attendanceData[subject.name] || [];
    let stats = {
        absenceCount: absences.length,
        totalClasses: subjectData?.totalClasses || null,
        minAttendancePercentage: subjectData?.maxAbsencePercentage || null,
        currentAttendancePercentage: 0,
        maxAbsences: 5,
        remainingAbsences: null,
        showWarning: false,
        isAtLimit: false,
        hoursPerDay: null
    };
    if (stats.totalClasses && stats.minAttendancePercentage) {
        const periods = subjectData.endPeriod - subjectData.startPeriod + 1;
        stats.hoursPerDay = periods;
        const attendedHours = stats.totalClasses - (stats.absenceCount * stats.hoursPerDay);
        stats.currentAttendancePercentage = Math.round((attendedHours / stats.totalClasses) * 100);
        stats.remainingAbsences = stats.maxAbsences - stats.absenceCount;
        stats.showWarning = stats.remainingAbsences <= 2 && stats.remainingAbsences > 0;
        stats.isAtLimit = stats.remainingAbsences <= 0;
    } else {
        stats.remainingAbsences = stats.maxAbsences - stats.absenceCount;
        stats.showWarning = stats.remainingAbsences <= 2 && stats.remainingAbsences > 0;
        stats.isAtLimit = stats.remainingAbsences <= 0;
    }
    return stats;
}
function renderAttendanceList() {
    const container = document.getElementById('attendanceList');
    const subjects = Object.keys(attendanceData);
    if (subjects.length === 0) {
        container.innerHTML = '<div class="no-data">No hay materias para mostrar<br><small>Agrega materias primero para gestionar inasistencias</small></div>';
        return;
    }
    container.innerHTML = subjects
        .filter(subjectName => scheduleData.some(s => s.name === subjectName))
        .map((subjectName, idx) => {
            const subject = { name: subjectName };
            const absences = attendanceData[subjectName];
            const stats = calculateAbsenceStats(subject);

            let warningHTML = '';
            if (stats.isAtLimit) {
                warningHTML = `<div class="attendance-warning">¡LÍMITE DE INASISTENCIAS ALCANZADO! Ya no puedes faltar más.</div>`;
            } else if (stats.showWarning) {
                warningHTML = `<div class="attendance-warning">¡ATENCIÓN! Solo puedes faltar ${stats.remainingAbsences} vez(es) más</div>`;
            }

            let statsHTML = '';
            if (stats.totalClasses && stats.minAttendancePercentage) {
                statsHTML = `
                <button class="toggle-details-btn" onclick="toggleStatsDetails(${idx})" type="button">Ver detalles de la materia</button>
                <div class="attendance-stats" id="stats-details-${idx}" style="display:none;">
                    <span class="stat-item">Horas cátedra: ${stats.totalClasses}</span>
                    <span class="stat-item">Asistencia requerida: ${stats.minAttendancePercentage}%</span>
                    <span class="stat-item">Inasistencias permitidas: ${stats.maxAbsences}</span>
                    <span class="stat-item">Inasistencias restantes: ${stats.remainingAbsences >= 0 ? stats.remainingAbsences : 0}</span>
                </div>`;
            }

            const absencesList = absences.map(absence => {
                const formattedDate = new Date(absence.date).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
                return `<div class="absence-item">
                    <div class="absence-date">${formattedDate}</div>
                    <div class="absence-reason">${absence.reason}</div>
                    <button class="remove-absence-btn" onclick="removeAbsence('${subjectName}', '${absence.date}')">
                        Eliminar
                    </button>
                </div>`;
            }).join('');

            return `<div class="attendance-item">
                ${warningHTML}
                <div class="attendance-header">
                    <div>
                        <strong>${subjectName}</strong><br>
                        <small style="color: var(--text-medium);">Total de inasistencias</small>
                    </div>
                    <div class="attendance-count">${absences.length}</div>
                    ${statsHTML}
                </div>
                <div class="absence-list">
                    ${absences.length > 0 ? absencesList : '<div class="no-data">No hay inasistencias registradas</div>'}
                </div>
            </div>`;
        }).join('');
}
function toggleStatsDetails(idx) {
    const el = document.getElementById('stats-details-' + idx);
    const btn = el.previousElementSibling;
    if (el.style.display === 'none') {
        el.style.display = 'flex';
        btn.textContent = 'Ocultar detalles de la materia';
    } else {
        el.style.display = 'none';
        btn.textContent = 'Ver detalles de la materia';
    }
}

// Tabs y hora actual
function showTab(tab) {
    document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tabEl => tabEl.classList.remove('active'));
    if (tab === 'agenda') {
        document.querySelector('.tab:nth-child(1)').classList.add('active');
        document.getElementById('agenda-tab').classList.add('active');
    } else if (tab === 'schedule') {
        document.querySelector('.tab:nth-child(2)').classList.add('active');
        document.getElementById('schedule-tab').classList.add('active');
    } else if (tab === 'attendance') {
        document.querySelector('.tab:nth-child(3)').classList.add('active');
        document.getElementById('attendance-tab').classList.add('active');
    }
}
function updateCurrentTime() {
    const now = new Date();
    const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('currentTime').textContent = time;
    document.getElementById('currentDate').textContent = date.charAt(0).toUpperCase() + date.slice(1);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        transform: translateX(100%);
        transition: all 0.4s ease;
        ${type === 'success' ? 'background: var(--accent-green);' : ''}
        ${type === 'error' ? 'background: #b71c1c;' : ''}
        ${type === 'info' ? 'background: var(--brown-medium);' : ''}
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.transform = 'translateX(0)'; }, 100);
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

function getUniqueProfessors() {
    const profs = {};
    for (const s of scheduleData) {
        if (!s.professorName || !s.professorEmail) continue;
        const key = s.professorName + '||' + s.professorEmail;
        if (!profs[key]) {
            profs[key] = {
                name: s.professorName,
                email: s.professorEmail
            };
        }
    }
    return Object.values(profs);
}

function renderProfessorsList() {
    const container = document.getElementById('professorsList');
    const professors = getUniqueProfessors();
    if (professors.length === 0) {
        container.innerHTML = '<div class="no-data">No hay profesores para mostrar.</div>';
        return;
    }
    container.innerHTML = professors.map((prof, idx) => `
        <div class="professor-card">
            <div class="professor-info">
                <span class="professor-name">${prof.name}</span>
                <div class="professor-email-row">
                    <span class="professor-email" id="prof-email-${idx}">${prof.email}</span>
                    <span class="copy-email-icon" title="Copiar correo" onclick="copyProfessorEmail('${prof.email}', this)">
                        <!-- SVG clipboard icon -->
                        <svg width="19" height="19" viewBox="0 0 20 20" fill="none" style="display:inline;vertical-align:middle;">
                          <rect x="5.5" y="4.5" width="10" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/>
                          <rect x="3.5" y="2.5" width="10" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
                        </svg>
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

function copyProfessorEmail(email, iconElem) {
    navigator.clipboard.writeText(email).then(() => {
        iconElem.classList.add('copied');
        const originalTitle = iconElem.title;
        iconElem.title = "¡Copiado!";
        setTimeout(() => {
            iconElem.classList.remove('copied');
            iconElem.title = originalTitle;
        }, 1200);
        showNotification("Correo copiado al portapapeles", "success");
    });
}

function showTab(tab) {
    document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tabEl => tabEl.classList.remove('active'));
    if (tab === 'agenda') {
        document.querySelector('.tab:nth-child(1)').classList.add('active');
        document.getElementById('agenda-tab').classList.add('active');
    } else if (tab === 'schedule') {
        document.querySelector('.tab:nth-child(2)').classList.add('active');
        document.getElementById('schedule-tab').classList.add('active');
    } else if (tab === 'attendance') {
        document.querySelector('.tab:nth-child(3)').classList.add('active');
        document.getElementById('attendance-tab').classList.add('active');
    } else if (tab === 'professors') {
        document.querySelector('.tab:nth-child(4)').classList.add('active');
        document.getElementById('professors-tab').classList.add('active');
        renderProfessorsList();
    }
}

document.getElementById('absenceModal').addEventListener('click', function(e) {
    if (e.target === this) closeAbsenceModal();
});