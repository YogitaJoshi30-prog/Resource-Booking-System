const DEFAULT_RESOURCES = [
    { id: 1, name: "Classroom 101", type: "Classroom", capacity: 60, equip: ["projector"] },
    { id: 2, name: "Lab A", type: "Lab", capacity: 40, equip: ["projector", "gpu"] },
    { id: 3, name: "Seminar Hall", type: "Hall", capacity: 150, equip: ["projector"] },
    { id: 4, name: "AI/ML Workstations", type: "Lab", capacity: 20, equip: ["gpu"], note: "Reserved for Faculty" },
    { id: 5, name: "Private Pod 1", type: "Study Room", capacity: 5, equip: [] },
    { id: 6, name: "Robotics Lab", type: "Lab", capacity: 30, equip: ["gpu", "projector"] }
];

const MAINTENANCE_RESOURCES = new Set(["AI/ML Workstations"]);

let resources = [];
let calendar = null;
let currentBookingResource = null;
let expiryTimeoutId = null;
let expiryIntervalId = null;
let heatmapChart = null;

function loadResources() {
    const saved = JSON.parse(localStorage.getItem("campus_resources"));
    if (Array.isArray(saved) && saved.length > 0) {
        resources = saved;
    } else {
        resources = JSON.parse(JSON.stringify(DEFAULT_RESOURCES));
        saveResources();
    }
}

function saveResources() {
    localStorage.setItem("campus_resources", JSON.stringify(resources));
}

function getNextResourceId() {
    if (!Array.isArray(resources) || resources.length === 0) return 1;
    return Math.max(...resources.map(r => r.id || 0)) + 1;
}

function isAdminView() {
    const adminDash = document.getElementById("dash-admin");
    return adminDash && adminDash.classList.contains("active");
}

document.addEventListener("DOMContentLoaded", () => {
    loadResources();
    removeExpiredBookings();
    scheduleBookingExpiryChecks();
    setTimeout(() => renderGrid(), 800);

    populateBookingTimeSelects();
    setDefaultBookingTimes();

    updateAdminChart();
    renderFacultyRequests();
    renderAdminBookingsTable();

    const dateInput = document.getElementById("bookDate");
    if (dateInput) {
        dateInput.min = new Date().toISOString().split("T")[0];
        dateInput.value = dateInput.min;
        dateInput.addEventListener("change", () => {
            if (calendar && dateInput.value) {
                calendar.gotoDate(dateInput.value);
            }
        });
    }
});

function bookingIsStillActive(booking, now = new Date()) {
    if (booking.status !== "Approved" || !booking.end) return false;
    return new Date(booking.end) > now;
}

function removeExpiredBookings() {
    const now = new Date();
    const all = JSON.parse(localStorage.getItem("resource_bookings")) || [];
    const active = all.filter(b => bookingIsStillActive(b, now));
    const removed = all.length - active.length;
    if (removed > 0) {
        saveBookings(active);
    }
    return removed;
}

function getBookings() {
    removeExpiredBookings();
    return JSON.parse(localStorage.getItem("resource_bookings")) || [];
}

function saveBookings(bookings) {
    localStorage.setItem("resource_bookings", JSON.stringify(bookings));
}

function getBookingsForResource(resourceId) {
    const resource = resources.find(r => r.id === resourceId);
    const now = new Date();
    return getBookings().filter(b =>
        bookingIsStillActive(b, now) &&
        b.start &&
        (b.resourceId === resourceId || (resource && b.resource === resource.name))
    );
}

function refreshUiAfterBookingsChange() {
    renderGrid();
    if (isAdminView()) {
        renderAdminBookingsTable();
        updateAdminChart();
    }
    if (currentBookingResource) {
        renderExistingBookingsInModal(currentBookingResource);
        if (calendar) initCalendarForResource(currentBookingResource);
    }
}

function scheduleBookingExpiryChecks() {
    if (expiryTimeoutId) {
        clearTimeout(expiryTimeoutId);
        expiryTimeoutId = null;
    }
    if (expiryIntervalId) {
        clearInterval(expiryIntervalId);
        expiryIntervalId = null;
    }

    const removed = removeExpiredBookings();
    if (removed > 0) refreshUiAfterBookingsChange();

    const now = new Date();
    let nextEnd = null;

    getBookings().forEach(b => {
        const end = new Date(b.end);
        if (end > now && (!nextEnd || end < nextEnd)) {
            nextEnd = end;
        }
    });

    if (nextEnd) {
        const msUntilEnd = nextEnd.getTime() - now.getTime() + 1000;
        expiryTimeoutId = setTimeout(() => {
            if (removeExpiredBookings() > 0) {
                refreshUiAfterBookingsChange();
            }
            scheduleBookingExpiryChecks();
        }, Math.min(msUntilEnd, 2147483647));
    }

    expiryIntervalId = setInterval(() => {
        if (removeExpiredBookings() > 0) {
            refreshUiAfterBookingsChange();
            scheduleBookingExpiryChecks();
        }
    }, 60000);
}

function parseBookingTime(booking) {
    const start = new Date(booking.start);
    const end = new Date(booking.end);
    return { start, end };
}

function timesOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
}

const TIME_12_OPTS = { hour: "numeric", minute: "2-digit", hour12: true };

function formatTime12h(date) {
    return date.toLocaleTimeString([], TIME_12_OPTS);
}

function formatTimeRange(start, end) {
    const sameDay = start.toDateString() === end.toDateString();
    if (sameDay) {
        return `${start.toLocaleDateString([], { month: "short", day: "numeric" })} ${formatTime12h(start)} – ${formatTime12h(end)}`;
    }
    const dateOpts = { month: "short", day: "numeric", ...TIME_12_OPTS };
    return `${start.toLocaleString([], dateOpts)} – ${end.toLocaleString([], dateOpts)}`;
}

function time12To24(hour12, minute, ampm) {
    let h = parseInt(hour12, 10);
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${minute}`;
}

function getBookingTimesFromForm() {
    return {
        startTime: time12To24(
            document.getElementById("bookStartHour").value,
            document.getElementById("bookStartMinute").value,
            document.getElementById("bookStartAmPm").value
        ),
        endTime: time12To24(
            document.getElementById("bookEndHour").value,
            document.getElementById("bookEndMinute").value,
            document.getElementById("bookEndAmPm").value
        )
    };
}

function populateBookingTimeSelects() {
    const hourOptions = Array.from({ length: 12 }, (_, i) => {
        const h = i + 1;
        return `<option value="${h}">${h}</option>`;
    }).join("");
    const minuteOptions = Array.from({ length: 60 }, (_, i) => {
        const m = String(i).padStart(2, "0");
        return `<option value="${m}">${m}</option>`;
    }).join("");

    ["bookStartHour", "bookEndHour"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = hourOptions;
    });
    ["bookStartMinute", "bookEndMinute"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = minuteOptions;
    });
}

function setDefaultBookingTimes() {
    document.getElementById("bookStartHour").value = "9";
    document.getElementById("bookStartMinute").value = "00";
    document.getElementById("bookStartAmPm").value = "AM";
    document.getElementById("bookEndHour").value = "10";
    document.getElementById("bookEndMinute").value = "00";
    document.getElementById("bookEndAmPm").value = "AM";
}

function getActiveBooking(resourceId, now = new Date()) {
    return getBookingsForResource(resourceId).find(b => {
        const { start, end } = parseBookingTime(b);
        return now >= start && now < end;
    });
}

function getResourceDisplayState(resource) {
    if (MAINTENANCE_RESOURCES.has(resource.name)) {
        return { status: "maintain", badge: "Maintenance", slotsHtml: "" };
    }

    const bookings = getBookingsForResource(resource.id);
    const now = new Date();
    const active = getActiveBooking(resource.id, now);

    const upcoming = bookings
        .filter(b => new Date(b.end) > now)
        .sort((a, b) => new Date(a.start) - new Date(b.start))
        .slice(0, 3);

    let slotsHtml = "";
    if (upcoming.length > 0) {
        slotsHtml = '<div class="booking-slots"><strong>Booked slots:</strong><br>' +
            upcoming.map(b => {
                const { start, end } = parseBookingTime(b);
                return `• ${formatTimeRange(start, end)} (${b.name})`;
            }).join("<br>") +
            "</div>";
    }

    if (active) {
        const { end } = parseBookingTime(active);
        return {
            status: "occupied",
            badge: `Booked until ${formatTime12h(end)}`,
            slotsHtml
        };
    }

    if (upcoming.length > 0) {
        const next = parseBookingTime(upcoming[0]);
        return {
            status: "available",
            badge: `Next booking: ${formatTime12h(next.start)}`,
            slotsHtml
        };
    }

    return { status: "available", badge: "Available Now", slotsHtml: "" };
}

function renderGrid() {
    const grid = document.getElementById("resourceGrid");
    grid.innerHTML = "";
    grid.classList.toggle("admin-mode", isAdminView());

    const filterCap = document.getElementById("filterCap").value;
    const filterEq = document.getElementById("filterEquip").value;

    const filtered = resources.filter(r => {
        const capMatch = filterCap === "all" ? true : r.capacity > 50;
        const eqMatch = filterEq === "all" ? true : r.equip.includes(filterEq);
        return capMatch && eqMatch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = "<p>No resources found matching criteria.</p>";
        return;
    }

    const showAdminActions = isAdminView();

    filtered.forEach(r => {
        const display = getResourceDisplayState(r);
        const card = document.createElement("div");
        card.className = `resource-card status-${display.status}`;
        card.onclick = () => openBookingModal(r);

        const adminBtn = showAdminActions
            ? `<button type="button" class="resource-delete-btn" title="Clear bookings for this resource" onclick="event.stopPropagation(); clearResourceBookings(${r.id})"><i class="fa-solid fa-trash"></i></button>`
            : "";

        card.innerHTML = `
            <span class="status-badge">${display.badge}</span>
            <h3>${escapeHtml(r.name)}</h3>
            <p class="capacity"><i class="fa-solid fa-users"></i> Seats: ${r.capacity}</p>
            <p style="font-size:13px; color:var(--text-light)">
                ${r.equip.includes("gpu") ? '<i class="fa-solid fa-microchip"></i> GPU ' : ""}
                ${r.equip.includes("projector") ? '<i class="fa-solid fa-video"></i> Projector' : ""}
                ${r.equip.length === 0 ? "Standard Amenities" : ""}
            </p>
            ${display.slotsHtml}
            ${adminBtn}
        `;
        grid.appendChild(card);
    });
}

function clearResourceBookings(resourceId) {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;

    const bookings = getBookingsForResource(resourceId);
    if (bookings.length === 0) {
        showToast("No bookings to delete for this resource.");
        return;
    }

    if (!confirm(`Delete all booking time slots for "${resource.name}"?`)) return;

    const remaining = getBookings().filter(b =>
        !(b.resourceId === resourceId || b.resource === resource.name)
    );
    saveBookings(remaining);
    scheduleBookingExpiryChecks();
    refreshUiAfterBookingsChange();
    showToast(`Bookings cleared for "${resource.name}".`);
}

function deleteBooking(bookingId) {
    const all = getBookings();
    const idx = all.findIndex(b => String(b.id) === String(bookingId));
    if (idx === -1) return;

    const b = all[idx];
    if (!confirm(`Delete this booking slot?\n\n${b.resource}\n${b.time || ""}`)) return;

    all.splice(idx, 1);
    saveBookings(all);
    scheduleBookingExpiryChecks();
    refreshUiAfterBookingsChange();
    showToast("Booking slot deleted.");
}

function getAdminResourceBookingInfo(resource, now = new Date()) {
    if (MAINTENANCE_RESOURCES.has(resource.name)) {
        return {
            status: "Maintenance",
            statusCls: "status-pending",
            bookedBy: "—",
            timeHtml: "—"
        };
    }

    const active = getActiveBooking(resource.id, now);
    const upcoming = getBookingsForResource(resource.id)
        .sort((a, b) => new Date(a.start) - new Date(b.start));

    if (active) {
        const { start, end } = parseBookingTime(active);
        return {
            status: "Booked now",
            statusCls: "status-denied",
            bookedBy: active.name,
            timeHtml: escapeHtml(formatTimeRange(start, end))
        };
    }

    if (upcoming.length > 0) {
        const timeHtml = upcoming.map(b => {
            const { start, end } = parseBookingTime(b);
            return escapeHtml(`${formatTimeRange(start, end)} (${b.name})`);
        }).join("<br>");
        return {
            status: "Has upcoming booking",
            statusCls: "status-pending",
            bookedBy: [...new Set(upcoming.map(b => b.name))].join(", "),
            timeHtml
        };
    }

    return {
        status: "Available",
        statusCls: "status-approved",
        bookedBy: "—",
        timeHtml: "—"
    };
}

function renderAdminBookingsTable() {
    const tbody = document.getElementById("adminBookingTableBody");
    if (!tbody) return;

    removeExpiredBookings();
    const now = new Date();

    if (resources.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No resources on campus.</td></tr>';
        return;
    }

    tbody.innerHTML = resources.map(r => {
        const info = getAdminResourceBookingInfo(r, now);
        const bookings = getBookingsForResource(r.id)
            .sort((a, b) => new Date(a.start) - new Date(b.start))
            .slice(0, 5);

        let bookingDetail = "—";
        if (bookings.length > 0) {
            bookingDetail = bookings.map(b => {
                const { start, end } = parseBookingTime(b);
                const range = escapeHtml(formatTimeRange(start, end));
                const who = escapeHtml(b.name || "—");
                const bid = escapeHtml(String(b.id ?? ""));
                return `<div class="booking-detail"><strong>${who}</strong><span>${range}</span><button type="button" class="btn-fancy btn-small btn-delete" onclick="deleteBooking('${bid}')" title="Delete this booking"><i class="fa-solid fa-trash"></i></button></div>`;
            }).join("");
        }

        return `
            <tr>
                <td><strong>${escapeHtml(r.name)}</strong></td>
                <td>${escapeHtml(r.type)}</td>
                <td><span class="request-status ${info.statusCls}">${info.status}</span></td>
                <td>${bookingDetail}</td>
                <td class="request-actions">
                    <button type="button" class="btn-fancy btn-small btn-delete" onclick="clearResourceBookings(${r.id})" title="Delete all bookings for this resource">
                        <i class="fa-solid fa-trash"></i> Clear bookings
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

function addNewResource(e) {
    e.preventDefault();

    const name = document.getElementById("newResName").value.trim();
    const type = document.getElementById("newResType").value;
    const capacity = parseInt(document.getElementById("newResCapacity").value, 10);
    const equip = [];
    if (document.getElementById("newResEquipProjector").checked) equip.push("projector");
    if (document.getElementById("newResEquipGpu").checked) equip.push("gpu");

    if (!name) {
        alert("Please enter a resource name.");
        return;
    }
    if (!Number.isFinite(capacity) || capacity <= 0) {
        alert("Capacity must be a positive number.");
        return;
    }
    if (resources.some(r => r.name.toLowerCase() === name.toLowerCase())) {
        alert("A resource with this name already exists.");
        return;
    }

    resources.push({
        id: getNextResourceId(),
        name,
        type,
        capacity,
        equip
    });
    saveResources();
    renderGrid();
    renderAdminBookingsTable();
    updateAdminChart();

    document.getElementById("newResName").value = "";
    document.getElementById("newResCapacity").value = "30";
    document.getElementById("newResEquipProjector").checked = false;
    document.getElementById("newResEquipGpu").checked = false;

    showToast(`Added resource: ${name}`);
}

function switchRole(role) {
    document.querySelectorAll(".dashboard-view").forEach(v => v.classList.remove("active"));
    document.getElementById(`dash-${role}`).classList.add("active");
    renderGrid();
    if (role === "admin") {
        renderAdminBookingsTable();
        updateAdminChart();
    }
    showToast(`Switched to ${role.toUpperCase()} View`);
}

function bookingToCalendarEvent(booking) {
    return {
        title: `Booked — ${booking.name}`,
        start: booking.start,
        end: booking.end,
        color: "#ef4444",
        editable: false,
        overlap: false
    };
}

function destroyCalendar() {
    if (calendar) {
        calendar.destroy();
        calendar = null;
    }
}

function renderExistingBookingsInModal(resource) {
    const container = document.getElementById("existingBookingsList");
    const hint = document.getElementById("modalBookingStatus");
    const bookings = getBookingsForResource(resource.id)
        .filter(b => new Date(b.end) > new Date())
        .sort((a, b) => new Date(a.start) - new Date(b.start));

    if (bookings.length === 0) {
        container.innerHTML = "";
        hint.textContent = "No upcoming bookings. Pick a date and time below.";
        return;
    }

    hint.textContent = "This resource already has bookings during these times:";
    container.innerHTML = bookings.map(b => {
        const { start, end } = parseBookingTime(b);
        return `<div class="slot-item">Booked ${formatTimeRange(start, end)} — ${b.name}</div>`;
    }).join("");
}

function initCalendarForResource(resource) {
    destroyCalendar();
    const calendarEl = document.getElementById("calendar");
    const events = getBookingsForResource(resource.id).map(bookingToCalendarEvent);

    const time12Format = { hour: "numeric", minute: "2-digit", meridiem: "short", hour12: true };

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "timeGridDay",
        headerToolbar: { left: "prev,next", center: "title", right: "" },
        slotMinTime: "08:00:00",
        slotMaxTime: "20:00:00",
        slotLabelFormat: time12Format,
        eventTimeFormat: time12Format,
        selectable: false,
        events,
        eventOverlap: false
    });
    calendar.render();
}

function openBookingModal(resource) {
    if (MAINTENANCE_RESOURCES.has(resource.name)) {
        showToast("This resource is under maintenance and cannot be booked currently.");
        return;
    }

    currentBookingResource = resource;
    document.getElementById("modalResourceName").innerText = `Book ${resource.name}`;
    document.getElementById("slideOverlay").classList.add("active");
    document.getElementById("bookingModal").classList.add("active");

    const dateInput = document.getElementById("bookDate");
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split("T")[0];
    }
    setDefaultBookingTimes();

    renderExistingBookingsInModal(resource);
    initCalendarForResource(resource);
}

function closeModal() {
    document.getElementById("slideOverlay").classList.remove("active");
    document.getElementById("bookingModal").classList.remove("active");
    currentBookingResource = null;
    destroyCalendar();
}

function buildBookingRange(dateStr, startTime, endTime) {
    const start = new Date(`${dateStr}T${startTime}`);
    const end = new Date(`${dateStr}T${endTime}`);
    return { start, end };
}

function hasConflict(resourceId, start, end, excludeId = null) {
    return getBookingsForResource(resourceId).some(b => {
        if (excludeId != null && b.id === excludeId) return false;
        const existing = parseBookingTime(b);
        return timesOverlap(start, end, existing.start, existing.end);
    });
}

function verifyBookingUser(userName) {
    const lmsStudents = JSON.parse(localStorage.getItem("university_students")) || [];
    const facMembers = JSON.parse(localStorage.getItem("university_faculty")) || [];

    const isStudent = lmsStudents.some(s => s.name.toLowerCase() === userName.toLowerCase());
    const isFaculty = facMembers.some(f => f.name.toLowerCase() === userName.toLowerCase());

    if (!isStudent && !isFaculty) {
        return { ok: false, message: "Unauthorized Access! You must be registered in the Student or Faculty Management system to book resources." };
    }

    if (isStudent) {
        const studentAcademics = JSON.parse(localStorage.getItem("student_academics")) || {};
        const acInfo = studentAcademics[userName.toLowerCase()];

        if (!acInfo || !acInfo.enrolled) {
            return { ok: false, message: "Access Denied! Complete Enrollment First." };
        }
        if (!acInfo.semRegistered) {
            return { ok: false, message: "Access Denied! Semester Registration Required." };
        }
        if (acInfo.attendance < 50) {
            return { ok: false, message: `Access Denied! Attendance is ${acInfo.attendance}%` };
        }

        const requests = JSON.parse(localStorage.getItem("resource_requests")) || [];
        const studentKey = userName.toLowerCase();
        const existingRequest = requests.find(r =>
            r.name.toLowerCase() === studentKey &&
            r.resource === currentBookingResource.name
        );

        if (existingRequest) {
            if (existingRequest.status === "Pending") {
                return { ok: false, message: "Your request is pending faculty approval. You cannot book until approved." };
            }
            if (existingRequest.status === "Denied") {
                return { ok: false, message: "Faculty denied your request. You cannot book this resource." };
            }
            if (existingRequest.status !== "Approved") {
                return { ok: false, message: "You do not have permission to book this resource." };
            }
        } else {
            requests.push({
                name: userName,
                resource: currentBookingResource.name,
                status: "Pending",
                requestedAt: new Date().toISOString()
            });
            localStorage.setItem("resource_requests", JSON.stringify(requests));
            renderFacultyRequests();
            return {
                ok: false,
                message: "Permission request sent to faculty. You can book only after they approve.",
                closeModal: true
            };
        }
    }

    return { ok: true, isFaculty, isStudent };
}

function submitBooking(e) {
    e.preventDefault();
    if (!currentBookingResource) return;

    const dateStr = document.getElementById("bookDate").value;
    const { startTime, endTime } = getBookingTimesFromForm();

    if (!dateStr || !startTime || !endTime) {
        showToast("Please enter date, start time, and end time.");
        return;
    }

    const { start, end } = buildBookingRange(dateStr, startTime, endTime);

    if (end <= start) {
        alert("End time must be after start time.");
        return;
    }

    const dayStart = new Date(`${dateStr}T08:00`);
    const dayEnd = new Date(`${dateStr}T20:00`);
    if (start < dayStart || end > dayEnd) {
        alert("Bookings are only allowed between 8:00 AM and 8:00 PM.");
        return;
    }

    if (start < new Date()) {
        alert("You cannot book a time slot in the past.");
        return;
    }

    if (hasConflict(currentBookingResource.id, start, end)) {
        alert("This resource is already booked for that time. Please choose a different slot.");
        renderExistingBookingsInModal(currentBookingResource);
        if (calendar) initCalendarForResource(currentBookingResource);
        return;
    }

    const userName = prompt(`Booking [${currentBookingResource.name}].\nEnter your registered Name:`);
    if (!userName) return;

    const auth = verifyBookingUser(userName);
    if (!auth.ok) {
        alert(auth.message);
        if (auth.closeModal) closeModal();
        return;
    }

    const history = getBookings();
    const role = auth.isFaculty ? "faculty" : "student";
    const rangeLabel = formatTimeRange(start, end);

    history.push({
        id: Date.now(),
        name: userName,
        role,
        resourceId: currentBookingResource.id,
        resource: currentBookingResource.name,
        start: start.toISOString(),
        end: end.toISOString(),
        time: rangeLabel,
        status: "Approved"
    });

    saveBookings(history);
    scheduleBookingExpiryChecks();
    renderGrid();
    renderAdminBookingsTable();
    updateAdminChart();
    closeModal();

    showToast(`Success! ${currentBookingResource.name} booked for ${userName} (${rangeLabel}).`);

    const feed = document.getElementById("liveFeed");
    if (feed) {
        feed.innerHTML = `<li><span class="badge" style="background:#3b82f6;color:white;">Booked</span> ${userName} reserved ${currentBookingResource.name} (${rangeLabel})</li>` + feed.innerHTML;
    }

    const dateInput = document.getElementById("bookDate");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
    populateBookingTimeSelects();
    setDefaultBookingTimes();
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    document.getElementById("toast-msg").innerText = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

function simulateDoorScan() {
    const scanner = document.getElementById("scannerModal");
    scanner.style.display = "flex";
    document.getElementById("scanResult").innerText = "Awaiting QR Code...";
    document.getElementById("scanResult").style.color = "white";

    setTimeout(() => {
        document.getElementById("scanResult").innerText = "Access Granted. Welcome!";
        document.getElementById("scanResult").style.color = "#10b981";
        const icon = document.querySelector(".scan-icon");
        icon.classList.remove("fa-qrcode");
        icon.classList.add("fa-check-circle");

        setTimeout(() => {
            scanner.style.display = "none";
            icon.classList.add("fa-qrcode");
            icon.classList.remove("fa-check-circle");
        }, 1500);
    }, 1500);
}

function mockScan() {
    simulateDoorScan();
}

function getResourceOccupancyPercent(resourceId, now = new Date()) {
    if (getActiveBooking(resourceId, now)) return 100;
    const upcoming = getBookingsForResource(resourceId);
    if (upcoming.length > 0) return 40;
    return 0;
}

function occupancyBarColor(percent) {
    if (percent >= 100) return "rgba(239, 68, 68, 0.85)";
    if (percent > 0) return "rgba(245, 158, 11, 0.75)";
    return "rgba(16, 185, 129, 0.55)";
}

function updateAdminChart() {
    const ctx = document.getElementById("heatmapChart");
    if (!ctx) return;

    const labels = resources.map(r => (r.name.length > 14 ? r.name.slice(0, 14) + "…" : r.name));
    const data = resources.map(r => getResourceOccupancyPercent(r.id));
    const colors = data.map(occupancyBarColor);

    if (heatmapChart) {
        heatmapChart.data.labels = labels;
        heatmapChart.data.datasets[0].data = data;
        heatmapChart.data.datasets[0].backgroundColor = colors;
        heatmapChart.update();
        return;
    }

    heatmapChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Booking load %",
                data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100 } }
        }
    });
}

function initChart() {
    updateAdminChart();
}

function formatRequestDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString([], { month: "short", day: "numeric", ...TIME_12_OPTS });
}

function statusClass(status) {
    if (status === "Approved") return "status-approved";
    if (status === "Denied") return "status-denied";
    return "status-pending";
}

function renderFacultyRequests() {
    const tbody = document.getElementById("facultyRequestTableBody");
    if (!tbody) return;

    const requests = JSON.parse(localStorage.getItem("resource_requests")) || [];

    if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No requests yet.</td></tr>';
        return;
    }

    tbody.innerHTML = requests.map((req, index) => {
        const pending = req.status === "Pending";
        return `
            <tr>
                <td>${escapeHtml(req.name)}</td>
                <td>${escapeHtml(req.resource)}</td>
                <td>${formatRequestDate(req.requestedAt)}</td>
                <td><span class="request-status ${statusClass(req.status)}">${escapeHtml(req.status)}</span></td>
                <td class="request-actions">
                    ${pending ? `
                        <button type="button" class="btn-fancy btn-small" onclick="approveRequest(${index})">Approve</button>
                        <button type="button" class="btn-fancy btn-small warning-btn" onclick="denyRequest(${index})">Deny</button>
                    ` : ""}
                    <button type="button" class="btn-fancy btn-small btn-delete" onclick="deleteRequest(${index})" title="Remove from list">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function deleteRequest(index) {
    const requests = JSON.parse(localStorage.getItem("resource_requests")) || [];
    if (!requests[index]) return;

    const req = requests[index];
    if (!confirm(`Remove request from ${req.name} for ${req.resource}?`)) return;

    requests.splice(index, 1);
    localStorage.setItem("resource_requests", JSON.stringify(requests));
    showToast("Request removed.");
    renderFacultyRequests();
}

function clearResolvedRequests() {
    const requests = JSON.parse(localStorage.getItem("resource_requests")) || [];
    const resolved = requests.filter(r => r.status !== "Pending");

    if (resolved.length === 0) {
        showToast("No reviewed requests to clear.");
        return;
    }

    if (!confirm(`Remove ${resolved.length} approved/denied request(s) from the list?`)) return;

    const pendingOnly = requests.filter(r => r.status === "Pending");
    localStorage.setItem("resource_requests", JSON.stringify(pendingOnly));
    showToast(`Cleared ${resolved.length} reviewed request(s).`);
    renderFacultyRequests();
}

function approveRequest(index) {
    let requests = JSON.parse(localStorage.getItem("resource_requests")) || [];
    if (!requests[index] || requests[index].status !== "Pending") return;

    requests[index].status = "Approved";
    requests[index].reviewedAt = new Date().toISOString();
    localStorage.setItem("resource_requests", JSON.stringify(requests));

    showToast("Approved. Student can now book this resource.");
    renderFacultyRequests();
}

function denyRequest(index) {
    let requests = JSON.parse(localStorage.getItem("resource_requests")) || [];
    if (!requests[index] || requests[index].status !== "Pending") return;

    requests[index].status = "Denied";
    requests[index].reviewedAt = new Date().toISOString();
    localStorage.setItem("resource_requests", JSON.stringify(requests));

    showToast("Request denied. Student cannot book this resource.");
    renderFacultyRequests();
}

function viewMyRequests() {
    let userName = prompt("Enter your registered name to view your requests:");
    if (!userName) return;

    let requests = JSON.parse(localStorage.getItem("resource_requests")) || [];
    const mine = requests.filter(r => r.name.toLowerCase() === userName.toLowerCase());

    if (mine.length === 0) {
        alert("No requests found for this name.");
        return;
    }

    let text = "Your resource permission requests:\n\n";
    mine.forEach(r => {
        text += `${r.resource}: ${r.status}\n`;
    });
    alert(text);
}
